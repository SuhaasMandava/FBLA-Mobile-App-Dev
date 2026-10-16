-- 005_expenses.sql
-- The Budget feature: tighten the expenses table, check every split in the
-- database, and limit edits to the person who paid or a trip organizer.
-- Replaces the placeholder "full access" policy from 004. Safe to re-run.
--
-- Money is integer cents. `splits` maps each member's user id to the cents they
-- owe for the expense, and always adds up to exactly `amount_cents`. `shares`
-- keeps the weights an expense was split by ("by shares"), or is NULL when it
-- was split evenly, so the app can show the split again when it's edited.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.expenses add column if not exists category text not null default 'other';
alter table public.expenses add column if not exists shares jsonb;

-- The baseline created these columns without NOT NULL. The app never wrote to
-- this table before this migration, so it should be empty; if it isn't, stop
-- and say so instead of deleting anyone's rows.
do $$
begin
  if exists (
    select 1 from public.expenses
    where trip_id is null or paid_by is null or description is null or splits is null or created_at is null
  ) then
    raise exception 'expenses has rows with missing values. Fix or delete them, then run 005_expenses.sql again.';
  end if;
end;
$$;

alter table public.expenses alter column trip_id set not null;
alter table public.expenses alter column paid_by set not null;
alter table public.expenses alter column description set not null;
alter table public.expenses alter column splits set not null;
alter table public.expenses alter column created_at set not null;

-- Whoever paid must be a real person. Deleting their account removes their expenses, like their memberships.
alter table public.expenses drop constraint if exists expenses_paid_by_fkey;
alter table public.expenses
  add constraint expenses_paid_by_fkey
  foreign key (paid_by) references public.profiles (id) on delete cascade;

-- Rules matching models/ExpenseForm.ts. NOT VALID applies them to every new or
-- edited row without failing on test rows saved earlier (same approach as 002).
alter table public.expenses drop constraint if exists expenses_description_length;
alter table public.expenses
  add constraint expenses_description_length
  check (char_length(btrim(description)) between 1 and 80) not valid;

-- More than $0 and at most $1,000,000 (the same cap as a trip budget).
alter table public.expenses drop constraint if exists expenses_amount_range;
alter table public.expenses
  add constraint expenses_amount_range
  check (amount_cents > 0 and amount_cents <= 100000000) not valid;

alter table public.expenses drop constraint if exists expenses_category_valid;
alter table public.expenses
  add constraint expenses_category_valid
  check (category in ('lodging', 'food', 'transport', 'activities', 'shopping', 'other')) not valid;

create index if not exists expenses_trip_created_idx on public.expenses (trip_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Splits must add up, and only involve people on the trip
-- ---------------------------------------------------------------------------
-- A CHECK constraint can't look at trip_members, so a trigger checks:
--   * the payer is a member of the trip,
--   * `splits` is an object of whole, non-negative cents, keyed by members of the trip,
--   * the splits add up to exactly amount_cents,
--   * `shares`, if present, is an object of whole numbers 0-99 for the same people.
-- SECURITY INVOKER (the default): the caller is a member, so the roster is readable to them.
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
  if not exists (
    select 1 from public.trip_members
    where trip_id = new.trip_id and user_id = new.paid_by
  ) then
    raise exception 'payer_not_member' using errcode = '23514';
  end if;

  if jsonb_typeof(new.splits) is distinct from 'object' then
    raise exception 'invalid_splits' using errcode = '23514';
  end if;

  -- Type checks come first in their own IF: SQL doesn't promise to evaluate OR left to right,
  -- so a combined condition could try to cast a string to a number.
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

drop trigger if exists expense_splits_valid on public.expenses;
create trigger expense_splits_valid
  before insert or update of trip_id, paid_by, amount_cents, splits, shares on public.expenses
  for each row execute function public.check_expense_splits();

-- ---------------------------------------------------------------------------
-- Who may do what
-- ---------------------------------------------------------------------------
-- Any member can see the trip's expenses. You log what you paid; an organizer
-- may also log or fix an expense for someone else. Only the payer or an
-- organizer can edit or delete an expense.
alter table public.expenses enable row level security;
revoke all on public.expenses from anon;

-- An expense can't be moved to another trip, and its id and timestamp are fixed.
revoke update on public.expenses from authenticated;
grant update (paid_by, description, amount_cents, category, splits, shares) on public.expenses to authenticated;

drop policy if exists "Members have full access to their trip's expenses" on public.expenses;

drop policy if exists "Members can read their trip's expenses" on public.expenses;
create policy "Members can read their trip's expenses"
  on public.expenses for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists "Members log what they paid; organizers log for anyone" on public.expenses;
create policy "Members log what they paid; organizers log for anyone"
  on public.expenses for insert to authenticated
  with check (
    public.is_trip_member(trip_id)
    and (paid_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );

-- USING decides which rows you may edit; WITH CHECK stops a member from handing
-- an expense to someone else (and then losing the right to fix it).
drop policy if exists "Payers and organizers can edit expenses" on public.expenses;
create policy "Payers and organizers can edit expenses"
  on public.expenses for update to authenticated
  using (
    public.is_trip_member(trip_id)
    and (paid_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  )
  with check (
    public.is_trip_member(trip_id)
    and (paid_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );

drop policy if exists "Payers and organizers can delete expenses" on public.expenses;
create policy "Payers and organizers can delete expenses"
  on public.expenses for delete to authenticated
  using (
    public.is_trip_member(trip_id)
    and (paid_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  );
