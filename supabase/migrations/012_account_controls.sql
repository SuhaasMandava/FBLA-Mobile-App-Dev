-- 012_account_controls.sql
-- Lets people delete their own account from the app. Safe to re-run.
--
-- The app can't delete from auth.users itself, so this function does it for
-- the signed-in caller only. Deleting the user removes their profile, their
-- trip memberships, expenses they paid and settlements they are part of (all
-- cascade); activities, comments and checklist items they created stay, with
-- the author cleared.
--
-- Two rules keep other people's trips working:
--   * someone who is the only organizer of a trip that has other members must
--     hand it over (make another member an organizer) first: 'hand_over_trip';
--   * trips where they are the only member go with them, so no empty trips stay behind.
-- Errors the app understands: not_authenticated, hand_over_trip.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if exists (
    select 1
    from public.trip_members me
    where me.user_id = uid and me.role = 'organizer'
      and exists (select 1 from public.trip_members o where o.trip_id = me.trip_id and o.user_id <> uid)
      and not exists (
        select 1 from public.trip_members o
        where o.trip_id = me.trip_id and o.user_id <> uid and o.role = 'organizer'
      )
  ) then
    raise exception 'hand_over_trip' using errcode = '23514';
  end if;

  delete from public.trips t
  where exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id = uid)
    and not exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id <> uid);

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
