-- 009_live_sync.sql
-- Live updates: turn on Supabase Realtime for the tables the app keeps open,
-- so a change on one phone shows up on the others without pulling to refresh.
-- Safe to re-run.
--
-- Realtime streams the changes in the `supabase_realtime` publication. It
-- checks each subscriber's SELECT policies (004-007) before sending them an
-- inserted or updated row, so nobody receives rows from a trip they aren't on.
-- Deleted rows can't be checked that way, so Realtime sends only their id;
-- the app removes an id only if it's already showing it.
--
-- If Realtime is off for the project, or this migration hasn't been run, the
-- app still works: it falls back to pull-to-refresh and reloading on reconnect.

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'itinerary_items', 'expenses', 'checklist_items', 'trip_announcements', 'activity_comments'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
