-- 011_audit_fixes.sql
-- Three fixes from the Oct 25 audit. Safe to re-run.
--   1. An expense can still be edited (say, its description) after someone in it
--      has left the trip, as long as the people and amounts don't change.
--   2. Two organizers leaving at the same moment can no longer leave a trip with none.
--   3. Only the person who was paid (or an organizer) can record a payment, so
--      nobody can clear their own debt without the other person agreeing.

-- ---------------------------------------------------------------------------
-- 1. Expense checks only run when the people or amounts change
-- ---------------------------------------------------------------------------
-- Same rules as 005_expenses.sql, with one early exit: an update that leaves
-- payer, amount, splits and shares as they were has nothing new to check.
create or replace function public.check_expense_splits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_total numeric := 0;
  v_count integer := 0;
begin
  if tg_op = 'UPDATE'
     and new.trip_id = old.trip_id
     and new.paid_by = old.paid_by
     and new.amount_cents = old.amount_cents
     and new.splits = old.splits
     and new.shares is not distinct from old.shares then
    return new;
  end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = new.trip_id and user_id = new.paid_by
  ) then
    raise exception 'payer_not_member' using errcode = '23514';
  end if;

  if jsonb_typeof(new.splits) is distinct from 'object' then
    raise exception 'invalid_splits' using errcode = '23514';
  end if;

  for v_key, v_value in select key, value from jsonb_each(new.splits) loop
    if jsonb_typeof(v_value) <> 'number' then
      raise exception 'invalid_splits' using errcode = '23514';
    end if;
    if (v_value #>> '{}')::numeric < 0 or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric) then
      raise exception 'invalid_splits' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.trip_members
      where trip_id = new.trip_id and user_id::text = v_key
    ) then
      raise exception 'split_member_not_on_trip' using errcode = '23514';
    end if;
    v_total := v_total + (v_value #>> '{}')::numeric;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 or v_total <> new.amount_cents then
    raise exception 'splits_total_mismatch' using errcode = '23514';
  end if;

  if new.shares is not null then
    if jsonb_typeof(new.shares) <> 'object' then
      raise exception 'invalid_splits' using errcode = '23514';
    end if;
    for v_key, v_value in select key, value from jsonb_each(new.shares) loop
      if not (new.splits ? v_key) or jsonb_typeof(v_value) <> 'number' then
        raise exception 'invalid_splits' using errcode = '23514';
      end if;
      if (v_value #>> '{}')::numeric not between 0 and 99
         or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric) then
        raise exception 'invalid_splits' using errcode = '23514';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. The last-organizer check takes a lock on the trip
-- ---------------------------------------------------------------------------
-- Without it, two organizers leaving together each see the other still there.
-- With it, the second one waits, then sees the real count. Otherwise as in 008.
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
  -- Deleting the trip or the account removes members too; nothing to protect then.
  if not exists (select 1 from public.trips where id = old.trip_id)
     or not exists (select 1 from public.profiles where id = old.user_id) then
    return old;
  end if;

  perform 1 from public.trips where id = old.trip_id for update;

  if not exists (
    select 1 from public.trip_members
    where trip_id = old.trip_id and role = 'organizer' and user_id <> old.user_id
  ) then
    raise exception 'last_organizer' using errcode = '23514';
  end if;
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Only the person who was paid, or an organizer, records a payment
-- ---------------------------------------------------------------------------
-- Undoing stays open to either person and organizers, so a mistake is easy to take back.
drop policy if exists "Payer, payee and organizers can record a settlement" on public.settlements;
drop policy if exists "Payee and organizers can record a settlement" on public.settlements;
create policy "Payee and organizers can record a settlement"
  on public.settlements for insert to authenticated
  with check (
    public.is_trip_member(trip_id)
    and (to_user = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );
