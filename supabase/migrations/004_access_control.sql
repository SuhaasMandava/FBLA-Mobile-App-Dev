-- 004_access_control.sql
-- Row Level Security for every table, plus the functions the app calls for the
-- operations RLS can't express as plain table access. Safe to re-run.
--
-- Model: you can only see and touch trips you are a member of; only an
-- organizer can edit or delete a trip; any member can plan the itinerary.
-- Users who are not signed in (the `anon` role) get no access at all.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
-- Policies on trip_members that query trip_members directly would recurse
-- forever, so membership checks go through SECURITY DEFINER functions (they run
-- with the owner's rights and skip RLS). search_path is pinned for safety, and
-- `(select auth.uid())` lets Postgres evaluate the caller once per query.

-- Is the signed-in user a member of this trip?
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = p_trip_id and tm.user_id = (select auth.uid())
  );
$$;

-- Is the signed-in user an organizer of this trip?
create or replace function public.is_trip_organizer(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = p_trip_id
      and tm.user_id = (select auth.uid())
      and tm.role = 'organizer'
  );
$$;

-- Does the signed-in user share at least one trip with this user? (Lets members see each other's names.)
create or replace function public.shares_trip_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Functions the app calls (RPC)
-- ---------------------------------------------------------------------------

-- Create a trip and record the caller as its organizer, in one transaction.
-- Needed because RLS (rightly) gives nobody direct INSERT on trips/trip_members:
-- a trip with no organizer row would be invisible to its own creator.
-- A taken invite code raises unique_violation (23505); the app picks a new code and retries.
create or replace function public.create_trip(
  p_name text,
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_budget_cents integer,
  p_invite_code text
)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trip public.trips;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.trips (name, destination, start_date, end_date, budget_cents, invite_code)
  values (btrim(p_name), btrim(p_destination), p_start_date, p_end_date, p_budget_cents, upper(btrim(p_invite_code)))
  returning * into v_trip;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip.id, v_uid, 'organizer');

  return v_trip;
end;
$$;

-- Join the trip that has this invite code, as a regular member.
-- A non-member can't read trips, so the lookup has to happen here with elevated rights.
-- Errors the app understands: invite_not_found, already_member.
create or replace function public.join_trip_by_code(p_code text)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trip public.trips;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_trip from public.trips where invite_code = upper(btrim(p_code));
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.trip_members where trip_id = v_trip.id and user_id = v_uid) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip.id, v_uid, 'member');

  return v_trip;
end;
$$;

-- Save a new order for one day's activities: p_item_ids is the full list in the
-- wanted order, and each item's sort_order becomes its 1-based position. One
-- statement, so the order changes atomically. SECURITY INVOKER (the default) on
-- purpose: it runs as the caller, so the itinerary_items policies still apply.
create or replace function public.reorder_itinerary_items(p_trip_id uuid, p_day date, p_item_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.itinerary_items i
  set sort_order = o.position::integer
  from unnest(p_item_ids) with ordinality as o(item_id, position)
  where i.id = o.item_id and i.trip_id = p_trip_id and i.day = p_day;
$$;

-- Only signed-in users may call these (functions are executable by everyone by default).
revoke execute on function public.create_trip(text, text, date, date, integer, text) from public, anon;
revoke execute on function public.join_trip_by_code(text) from public, anon;
revoke execute on function public.reorder_itinerary_items(uuid, date, uuid[]) from public, anon;
revoke execute on function public.is_trip_member(uuid) from public, anon;
revoke execute on function public.is_trip_organizer(uuid) from public, anon;
revoke execute on function public.shares_trip_with(uuid) from public, anon;
grant execute on function public.create_trip(text, text, date, date, integer, text) to authenticated;
grant execute on function public.join_trip_by_code(text) to authenticated;
grant execute on function public.reorder_itinerary_items(uuid, date, uuid[]) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.is_trip_organizer(uuid) to authenticated;
grant execute on function public.shares_trip_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Turn RLS on everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.expenses enable row level security;

-- Signed-out visitors never touch tables. (RLS would block them anyway; this is a second lock.)
revoke all on public.profiles, public.trips, public.trip_members, public.itinerary_items, public.expenses from anon;

-- Signed-in users may only change the columns that are meant to be edited:
-- ids, ownership, invite codes and timestamps are fixed once written.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke update on public.trips from authenticated;
grant update (name, destination, start_date, end_date, budget_cents) on public.trips to authenticated;
revoke update on public.itinerary_items from authenticated;
grant update (day, title, time, location, notes, sort_order) on public.itinerary_items to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "Read own profile and profiles of people on your trips" on public.profiles;
create policy "Read own profile and profiles of people on your trips"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_trip_with(id));

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- No INSERT policy: profiles are created by the on_auth_user_created trigger only.

-- ---------------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------------
drop policy if exists "Members can read their trips" on public.trips;
create policy "Members can read their trips"
  on public.trips for select to authenticated
  using (public.is_trip_member(id));

drop policy if exists "Organizers can edit their trips" on public.trips;
create policy "Organizers can edit their trips"
  on public.trips for update to authenticated
  using (public.is_trip_organizer(id))
  with check (public.is_trip_organizer(id));

drop policy if exists "Organizers can delete their trips" on public.trips;
create policy "Organizers can delete their trips"
  on public.trips for delete to authenticated
  using (public.is_trip_organizer(id));
-- No INSERT policy: trips are created through create_trip(), which also adds the organizer.

-- ---------------------------------------------------------------------------
-- trip_members
-- ---------------------------------------------------------------------------
drop policy if exists "Members can see who is on their trips" on public.trip_members;
create policy "Members can see who is on their trips"
  on public.trip_members for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Leave a trip, or organizers remove members" on public.trip_members;
create policy "Leave a trip, or organizers remove members"
  on public.trip_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_trip_organizer(trip_id));
-- No INSERT/UPDATE policy: membership and roles change only through create_trip() and join_trip_by_code().

-- ---------------------------------------------------------------------------
-- itinerary_items
-- ---------------------------------------------------------------------------
drop policy if exists "Members can read their trip's itinerary" on public.itinerary_items;
create policy "Members can read their trip's itinerary"
  on public.itinerary_items for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Members can add itinerary items as themselves" on public.itinerary_items;
create policy "Members can add itinerary items as themselves"
  on public.itinerary_items for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = (select auth.uid()));

-- Any member may edit or reorder any item: the plan is shared. (trip_id and
-- created_by can't be changed, see the column grants above.)
drop policy if exists "Members can edit and reorder itinerary items" on public.itinerary_items;
create policy "Members can edit and reorder itinerary items"
  on public.itinerary_items for update to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

drop policy if exists "Authors and organizers can delete itinerary items" on public.itinerary_items;
create policy "Authors and organizers can delete itinerary items"
  on public.itinerary_items for delete to authenticated
  using (
    public.is_trip_member(trip_id)
    and (created_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );

-- ---------------------------------------------------------------------------
-- expenses (the Budget feature isn't built yet; this just keeps the table closed to outsiders)
-- ---------------------------------------------------------------------------
drop policy if exists "Members have full access to their trip's expenses" on public.expenses;
create policy "Members have full access to their trip's expenses"
  on public.expenses for all to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
