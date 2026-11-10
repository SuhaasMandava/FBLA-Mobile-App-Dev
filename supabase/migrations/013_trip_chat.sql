-- 013_trip_chat.sql
-- Group chat: one conversation per trip, so planning talk stays next to the plan
-- instead of in a separate messaging app. Safe to re-run.
--
-- Who may do what, in line with 004 and 007: you can only see and touch trips
-- you are a member of. Signed-out visitors (the `anon` role) get no access.
--   * Any member reads the trip's messages and sends one, as themselves.
--   * Whoever wrote a message, or an organizer, can delete it.
--   * A message is never edited (send a correction instead), so nobody has UPDATE.
-- A message may point at one itinerary activity ("about the hike"); the
-- activity must be on the same trip. The author and the time are filled in by
-- the database, so the app can only send the trip, the text and the activity.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- Rules matching models/MessageForm.ts.
  body text not null check (char_length(btrim(body)) between 1 and 500),
  -- The activity the message is about, if any. Deleting the activity keeps the
  -- message and only drops the link.
  item_id uuid references public.itinerary_items (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists trip_messages_trip_created_idx
  on public.trip_messages (trip_id, created_at desc);

-- ---------------------------------------------------------------------------
-- A linked activity must belong to the message's trip
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER (the default): an activity on someone else's trip is
-- invisible to the caller, so linking it fails the same way as one that
-- doesn't exist.
create or replace function public.check_trip_message_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.item_id is not null and not exists (
    select 1 from public.itinerary_items i where i.id = new.item_id and i.trip_id = new.trip_id
  ) then
    raise exception 'activity_not_found' using errcode = 'P0002';
  end if;
  return new;
end;
$$;

drop trigger if exists trip_message_activity on public.trip_messages;
create trigger trip_message_activity
  before insert on public.trip_messages
  for each row execute function public.check_trip_message_activity();

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
alter table public.trip_messages enable row level security;
revoke all on public.trip_messages from anon;

-- Only the trip, the text and the activity can be sent; nothing can be changed afterwards.
revoke insert, update on public.trip_messages from authenticated;
grant select, delete on public.trip_messages to authenticated;
grant insert (trip_id, body, item_id) on public.trip_messages to authenticated;

drop policy if exists "Members can read their trip's messages" on public.trip_messages;
create policy "Members can read their trip's messages"
  on public.trip_messages for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Members can send messages as themselves" on public.trip_messages;
create policy "Members can send messages as themselves"
  on public.trip_messages for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = (select auth.uid()));

drop policy if exists "Authors and organizers can delete messages" on public.trip_messages;
create policy "Authors and organizers can delete messages"
  on public.trip_messages for delete to authenticated
  using (
    public.is_trip_member(trip_id)
    and (created_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );

-- ---------------------------------------------------------------------------
-- Live updates (see 009_live_sync.sql)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_messages'
  ) then
    alter publication supabase_realtime add table public.trip_messages;
  end if;
end;
$$;
