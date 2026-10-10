-- Schema for the FBLA mobile app. Paste into the Supabase SQL editor.
-- Requires pgcrypto (or pgsodium) for gen_random_uuid(); enabled by default
-- on Supabase projects.
--
-- Safe to re-run: every statement is idempotent. If your database was created
-- from an earlier version of this file, the "Upgrade" block at the bottom
-- adds the columns introduced since (the CREATE TABLE statements above it
-- are skipped for tables that already exist).

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text,
  destination text,
  start_date date,
  end_date date,
  budget_cents integer not null default 0 check (budget_cents >= 0),
  invite_code text unique, -- 6 chars, uppercase; how other people join the trip
  created_at timestamptz default now()
);

create table if not exists trip_members (
  trip_id uuid references trips(id),
  user_id uuid,
  role text not null default 'member' check (role in ('organizer', 'member')),
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

-- Upgrade: columns added after the first version of this schema.
-- Existing trips get budget 0 and no invite code; existing members become 'member'.
alter table trips add column if not exists budget_cents integer not null default 0 check (budget_cents >= 0);
alter table trips add column if not exists invite_code text;
create unique index if not exists trips_invite_code_key on trips (invite_code);
alter table trip_members add column if not exists role text not null default 'member' check (role in ('organizer', 'member'));
