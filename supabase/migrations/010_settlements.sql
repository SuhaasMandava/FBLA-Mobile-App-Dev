-- 010_settlements.sql
-- Trip completion: record that one member paid another back ("Mark as paid"),
-- so balances can reach zero. Safe to re-run.
--
-- A settlement is a payment between two members, in integer cents. The app
-- adds it to the balances worked out from the expenses (models/BudgetCalculator.ts).
-- Either person in the payment, or a trip organizer, can record it or undo it.
-- Settlements are never edited: to fix one, undo it and record it again.

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  constraint settlements_amount_range check (amount_cents > 0 and amount_cents <= 100000000),
  constraint settlements_different_people check (from_user <> to_user)
);

create index if not exists settlements_trip_created_idx on public.settlements (trip_id, created_at desc);

-- Both people must be on the trip. SECURITY INVOKER (the default): the caller is a member, so the roster is readable.
create or replace function public.check_settlement_members()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.trip_members where trip_id = new.trip_id and user_id = new.from_user)
     or not exists (select 1 from public.trip_members where trip_id = new.trip_id and user_id = new.to_user) then
    raise exception 'settlement_member_not_on_trip' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists settlement_members_valid on public.settlements;
create trigger settlement_members_valid
  before insert on public.settlements
  for each row execute function public.check_settlement_members();

alter table public.settlements enable row level security;
revoke all on public.settlements from anon;
revoke update on public.settlements from authenticated;

drop policy if exists "Members can read their trip's settlements" on public.settlements;
create policy "Members can read their trip's settlements"
  on public.settlements for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Payer, payee and organizers can record a settlement" on public.settlements;
create policy "Payer, payee and organizers can record a settlement"
  on public.settlements for insert to authenticated
  with check (
    public.is_trip_member(trip_id)
    and (from_user = (select auth.uid()) or to_user = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );

drop policy if exists "Payer, payee and organizers can undo a settlement" on public.settlements;
create policy "Payer, payee and organizers can undo a settlement"
  on public.settlements for delete to authenticated
  using (
    public.is_trip_member(trip_id)
    and (from_user = (select auth.uid()) or to_user = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );

-- Live updates, like 009.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settlements'
  ) then
    alter publication supabase_realtime add table public.settlements;
  end if;
end;
$$;
