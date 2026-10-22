-- 006_checklist.sql
-- The shared trip checklist (packing, to-dos, bookings). Safe to re-run.
--
-- Who may do what, in line with the itinerary (004): you can only see and touch
-- trips you are a member of; any member can add items, tick them off, rename
-- them and assign them; only the member who added an item, or an organizer, can
-- delete it. Signed-out visitors (the `anon` role) get no access.
--
-- `done` is the only thing the app sends about completion. Who finished an item
-- and when are stamped by a trigger from the caller's own id, so nobody can
-- claim a tick on someone else's behalf.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- Rules matching models/ChecklistForm.ts.
  title text not null check (char_length(btrim(title)) between 1 and 100),
  category text not null default 'todo' check (category in ('packing', 'todo', 'booking')),
  -- Who is responsible. NULL = unassigned (also what remains if that person's account is deleted).
  assigned_to uuid references public.profiles (id) on delete set null,
  done boolean not null default false,
  completed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists checklist_items_trip_created_idx
  on public.checklist_items (trip_id, created_at);

-- ---------------------------------------------------------------------------
-- Semantic rules a CHECK constraint can't express
-- ---------------------------------------------------------------------------
--   * an assignee must be a member of the item's trip,
--   * completed_by / completed_at always follow `done` and the caller.
-- The roster check only runs when the assignee is set or changed, so an item
-- assigned to someone who later leaves the trip can still be ticked off.
-- SECURITY INVOKER (the default): the caller is a member, so the roster is readable to them.
create or replace function public.check_checklist_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
     and not exists (
       select 1 from public.trip_members
       where trip_id = new.trip_id and user_id = new.assigned_to
     ) then
    raise exception 'assignee_not_member' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' or new.done is distinct from old.done then
    if new.done then
      new.completed_by := (select auth.uid());
      new.completed_at := now();
    else
      new.completed_by := null;
      new.completed_at := null;
    end if;
  else
    -- Not a change of `done`: keep the existing stamp whatever the statement said.
    new.completed_by := old.completed_by;
    new.completed_at := old.completed_at;
  end if;

  return new;
end;
$$;

drop trigger if exists checklist_item_valid on public.checklist_items;
create trigger checklist_item_valid
  before insert or update on public.checklist_items
  for each row execute function public.check_checklist_item();

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
alter table public.checklist_items enable row level security;
revoke all on public.checklist_items from anon;

-- Ids, ownership, the trip and the completion stamp are fixed by the database;
-- members may only change what the app lets them edit.
revoke update on public.checklist_items from authenticated;
grant update (title, category, assigned_to, done) on public.checklist_items to authenticated;

drop policy if exists "Members can read their trip's checklist" on public.checklist_items;
create policy "Members can read their trip's checklist"
  on public.checklist_items for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Members can add checklist items as themselves" on public.checklist_items;
create policy "Members can add checklist items as themselves"
  on public.checklist_items for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = (select auth.uid()));

-- Any member may edit, assign or tick any item: the list is shared.
drop policy if exists "Members can edit checklist items" on public.checklist_items;
create policy "Members can edit checklist items"
  on public.checklist_items for update to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

drop policy if exists "Authors and organizers can delete checklist items" on public.checklist_items;
create policy "Authors and organizers can delete checklist items"
  on public.checklist_items for delete to authenticated
  using (
    public.is_trip_member(trip_id)
    and (created_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );
