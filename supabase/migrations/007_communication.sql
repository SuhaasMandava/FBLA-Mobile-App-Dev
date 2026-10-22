-- 007_communication.sql
-- Group communication: announcements from trip organizers, and comments on
-- itinerary activities. Safe to re-run.
--
-- Who may do what, in line with 004 and 006: you can only see and touch trips
-- you are a member of. Signed-out visitors (the `anon` role) get no access.
--   * Announcements: any member reads them; only an organizer posts one, as
--     themselves; any organizer can delete one.
--   * Comments: any member reads them and comments, as themselves, on an
--     activity of their trip; whoever wrote a comment, or an organizer, can
--     delete it.
-- Neither is ever edited (post a correction instead), so nobody has UPDATE.
-- Authors, trips and timestamps are filled in by the database, so the app can
-- only send the text (and, for a comment, which activity it is on).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.trip_announcements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- Rules matching models/MessageForm.ts.
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists trip_announcements_trip_created_idx
  on public.trip_announcements (trip_id, created_at desc);

create table if not exists public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  -- Deleting the activity (or the whole trip) removes its comments.
  item_id uuid not null references public.itinerary_items (id) on delete cascade,
  -- Copied from the activity by the trigger below, so policies (and live
  -- updates later) can filter by trip without a join. An activity never moves
  -- to another trip (004 doesn't grant UPDATE on itinerary_items.trip_id).
  trip_id uuid not null references public.trips (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists activity_comments_trip_created_idx
  on public.activity_comments (trip_id, created_at);
create index if not exists activity_comments_item_idx
  on public.activity_comments (item_id);

-- ---------------------------------------------------------------------------
-- A comment belongs to its activity's trip
-- ---------------------------------------------------------------------------
-- The app sends only item_id and body; the trip is looked up here. SECURITY
-- INVOKER (the default): an activity on someone else's trip is invisible to the
-- caller, so commenting on it fails with activity_not_found. Row Level Security
-- (checked after this trigger) then confirms the caller is on that trip.
create or replace function public.set_activity_comment_trip()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_trip uuid;
begin
  select trip_id into v_trip from public.itinerary_items where id = new.item_id;
  if v_trip is null then
    raise exception 'activity_not_found' using errcode = 'P0002';
  end if;
  new.trip_id := v_trip;
  return new;
end;
$$;

drop trigger if exists activity_comment_trip on public.activity_comments;
create trigger activity_comment_trip
  before insert on public.activity_comments
  for each row execute function public.set_activity_comment_trip();

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
alter table public.trip_announcements enable row level security;
alter table public.activity_comments enable row level security;
revoke all on public.trip_announcements, public.activity_comments from anon;

-- Only the text (and the activity) can be sent; nothing can be changed afterwards.
revoke insert, update on public.trip_announcements from authenticated;
grant insert (trip_id, body) on public.trip_announcements to authenticated;
revoke insert, update on public.activity_comments from authenticated;
grant insert (item_id, body) on public.activity_comments to authenticated;

-- trip_announcements
drop policy if exists "Members can read their trip's announcements" on public.trip_announcements;
create policy "Members can read their trip's announcements"
  on public.trip_announcements for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Organizers can post announcements as themselves" on public.trip_announcements;
create policy "Organizers can post announcements as themselves"
  on public.trip_announcements for insert to authenticated
  with check (public.is_trip_organizer(trip_id) and created_by = (select auth.uid()));

drop policy if exists "Organizers can delete announcements" on public.trip_announcements;
create policy "Organizers can delete announcements"
  on public.trip_announcements for delete to authenticated
  using (public.is_trip_organizer(trip_id));

-- activity_comments
drop policy if exists "Members can read their trip's comments" on public.activity_comments;
create policy "Members can read their trip's comments"
  on public.activity_comments for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Members can comment as themselves" on public.activity_comments;
create policy "Members can comment as themselves"
  on public.activity_comments for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = (select auth.uid()));

drop policy if exists "Authors and organizers can delete comments" on public.activity_comments;
create policy "Authors and organizers can delete comments"
  on public.activity_comments for delete to authenticated
  using (
    public.is_trip_member(trip_id)
    and (created_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );
