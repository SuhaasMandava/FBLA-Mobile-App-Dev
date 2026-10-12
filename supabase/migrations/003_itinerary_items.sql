-- 003_itinerary_items.sql
-- Day-by-day activities for a trip. Safe to re-run.

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  time time, -- optional start time
  location text check (location is null or char_length(location) <= 120),
  notes text check (notes is null or char_length(notes) <= 1000),
  sort_order integer not null default 0, -- position within the day, 1 = first
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists itinerary_items_trip_day_order_idx
  on public.itinerary_items (trip_id, day, sort_order);

-- Locked down until 004_access_control.sql adds the policies.
alter table public.itinerary_items enable row level security;

-- An activity's day must fall inside the trip's dates. A CHECK constraint can't
-- look at another table, so a trigger enforces it.
create or replace function public.check_itinerary_day()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_start date;
  v_end date;
begin
  select start_date, end_date into v_start, v_end
  from public.trips
  where id = new.trip_id;

  if v_start is not null and (new.day < v_start or new.day > v_end) then
    raise exception 'day_outside_trip' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists itinerary_day_within_trip on public.itinerary_items;
create trigger itinerary_day_within_trip
  before insert or update of day, trip_id on public.itinerary_items
  for each row execute function public.check_itinerary_day();
