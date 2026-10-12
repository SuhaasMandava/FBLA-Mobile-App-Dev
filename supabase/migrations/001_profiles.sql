-- 001_profiles.sql
-- One profile row per signed-up user. Holds the display name that other trip
-- members see (auth.users itself is not readable by the app).
--
-- Run the migrations in this folder in numeric order in the Supabase SQL editor,
-- after the baseline in ../schema.sql. Safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 50),
  created_at timestamptz not null default now()
);

-- Locked down until 004_access_control.sql adds the policies: with RLS on and no
-- policy, nobody can read or write the table through the API.
alter table public.profiles enable row level security;

-- Create the profile automatically when someone signs up. The app passes the
-- display name as sign-up metadata (options.data.display_name).
-- SECURITY DEFINER because the new user has no rights on profiles yet;
-- search_path is pinned so the function can't be hijacked by a same-named object.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 50), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that already exist (e.g. earlier test sign-ins).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- trip_members.user_id becomes a real reference so member names can be joined in.
-- Rows pointing at users that no longer exist can't be valid members, so they go first.
delete from public.trip_members
where user_id not in (select id from public.profiles);

alter table public.trip_members drop constraint if exists trip_members_user_id_fkey;
alter table public.trip_members
  add constraint trip_members_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
