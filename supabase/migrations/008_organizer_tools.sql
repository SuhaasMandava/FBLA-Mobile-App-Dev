-- 008_organizer_tools.sql
-- Database rules behind the organizer tools (edit trip, delete trip, leave
-- trip, remove member, make organizer). Safe to re-run.
--
-- Editing and deleting a trip and removing members were already limited to
-- organizers in 004 (and leaving to yourself). This migration closes the gaps
-- those policies can't express:
--   * every trip keeps at least one organizer, so a trip can never be left
--     with nobody able to manage it;
--   * an organizer can make another member an organizer (so they can hand the
--     trip over and leave);
--   * a trip's dates must still cover every planned activity after an edit.

-- ---------------------------------------------------------------------------
-- Every trip keeps an organizer
-- ---------------------------------------------------------------------------
-- Refuses to remove a trip's last organizer (leaving, or being removed).
-- Two removals are let through, because the trip or the person is going away
-- entirely: deleting the whole trip (its member rows are deleted by the
-- cascade after the trip row is gone) and deleting an account (likewise, after
-- the profile row is gone).
-- SECURITY DEFINER so it sees every member row whatever the caller may read;
-- search_path is pinned so it can't be hijacked.
create or replace function public.keep_an_organizer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'organizer' then
    return old;
  end if;
  if not exists (select 1 from public.trips where id = old.trip_id)
     or not exists (select 1 from public.profiles where id = old.user_id) then
    return old;
  end if;
  if not exists (
    select 1 from public.trip_members
    where trip_id = old.trip_id and role = 'organizer' and user_id <> old.user_id
  ) then
    raise exception 'last_organizer' using errcode = '23514';
  end if;
  return old;
end;
$$;

drop trigger if exists trip_keeps_an_organizer on public.trip_members;
create trigger trip_keeps_an_organizer
  before delete on public.trip_members
  for each row execute function public.keep_an_organizer();

-- ---------------------------------------------------------------------------
-- Make another member an organizer
-- ---------------------------------------------------------------------------
-- trip_members has no UPDATE policy (roles never change through plain table
-- access), so promotion goes through this function, like joining does.
-- Errors the app understands: not_permitted, member_not_found.
create or replace function public.make_trip_organizer(p_trip_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_trip_organizer(p_trip_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  update public.trip_members
  set role = 'organizer'
  where trip_id = p_trip_id and user_id = p_user_id;

  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.make_trip_organizer(uuid, uuid) from public, anon;
grant execute on function public.make_trip_organizer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Trip dates must cover the itinerary
-- ---------------------------------------------------------------------------
-- 003 stops an activity from being put outside the trip; this stops the trip
-- from being shortened around an activity. Only runs when the dates change.
-- SECURITY INVOKER (the default): only organizers can update trips, and they
-- can read their trip's itinerary.
create or replace function public.check_trip_dates_cover_itinerary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.itinerary_items
    where trip_id = new.id and (day < new.start_date or day > new.end_date)
  ) then
    raise exception 'activities_outside_dates' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trip_dates_cover_itinerary on public.trips;
create trigger trip_dates_cover_itinerary
  before update of start_date, end_date on public.trips
  for each row execute function public.check_trip_dates_cover_itinerary();
