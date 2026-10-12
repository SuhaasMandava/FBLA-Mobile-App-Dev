-- 002_trip_constraints.sql
-- Tighten the trips tables so bad data is rejected by the database, not just the app.
-- Safe to re-run.

-- Invite codes are exactly 6 uppercase letters/digits. NULL stays allowed for
-- trips created before invite codes existed.
alter table public.trips drop constraint if exists trips_invite_code_format;
alter table public.trips
  add constraint trips_invite_code_format
  check (invite_code is null or invite_code ~ '^[A-Z0-9]{6}$');

-- Name 3-50 characters; end date not before start date. NOT VALID applies the
-- rule to every new or edited row without failing on test rows saved earlier.
alter table public.trips drop constraint if exists trips_name_length;
alter table public.trips
  add constraint trips_name_length
  check (char_length(btrim(name)) between 3 and 50) not valid;

alter table public.trips drop constraint if exists trips_dates_in_order;
alter table public.trips
  add constraint trips_dates_in_order
  check (end_date >= start_date) not valid;

-- Deleting a trip (organizers only, see 004) must remove its members and expenses
-- with it; without ON DELETE CASCADE the delete would be refused.
alter table public.trip_members drop constraint if exists trip_members_trip_id_fkey;
alter table public.trip_members
  add constraint trip_members_trip_id_fkey
  foreign key (trip_id) references public.trips (id) on delete cascade;

alter table public.expenses drop constraint if exists expenses_trip_id_fkey;
alter table public.expenses
  add constraint expenses_trip_id_fkey
  foreign key (trip_id) references public.trips (id) on delete cascade;
