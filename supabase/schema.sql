-- Schema for the FBLA mobile app. Paste into the Supabase SQL editor.
-- Requires pgcrypto (or pgsodium) for gen_random_uuid(); enabled by default
-- on Supabase projects.

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text,
  destination text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table if not exists trip_members (
  trip_id uuid references trips(id),
  user_id uuid,
  primary key (trip_id, user_id)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id),
  paid_by uuid,
  description text,
  amount_cents integer not null,
  splits jsonb,
  created_at timestamptz default now()
);
