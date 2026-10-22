-- supabase/seed/demo_trip.sql
-- Demo mode: preloads a sample trip with activities, expenses, checklist items,
-- an announcement and comments, so the app has something to show straight away.
-- This is NOT a migration: run it only on a demo or test project, never on real data.
--
-- Before running:
--   1. Run supabase/schema.sql and every migration (001-009).
--   2. In the app, create the demo accounts with Create Account:
--        demo.organizer@example.com   (required: owns the trip)
--        demo.member@example.com      (optional: a second phone)
--        demo.friend@example.com      (optional: a third person on the trip)
--      Use any password you like; nothing here touches passwords.
--   3. Paste this file into the Supabase SQL editor and run it.
--
-- Safe to re-run: it first deletes the previous demo trip (invite code DEMO26)
-- along with everything on it, then builds it again around today's date, so
-- the trip is always under way when you present. Change the emails below if
-- you used different ones.

-- Splits an amount (integer cents) evenly between people; leftover cents go to the first ones,
-- so the parts always add up to exactly the amount (the expenses trigger checks this).
create or replace function pg_temp.demo_split(p_amount integer, p_people uuid[])
returns jsonb
language sql
as $$
  select jsonb_object_agg(
    person::text,
    p_amount / cardinality(p_people) + case when idx <= p_amount % cardinality(p_people) then 1 else 0 end
  )
  from unnest(p_people) with ordinality as t(person, idx);
$$;

do $$
declare
  v_organizer uuid := (select id from auth.users where lower(email) = 'demo.organizer@example.com');
  v_member uuid := (select id from auth.users where lower(email) = 'demo.member@example.com');
  v_friend uuid := (select id from auth.users where lower(email) = 'demo.friend@example.com');
  v_people uuid[];
  v_trip uuid;
  v_start date := current_date; -- day 1 is today
  v_hike uuid;
  v_rafting uuid;
begin
  if v_organizer is null then
    raise exception 'No account for demo.organizer@example.com. Create it in the app first (Create Account), then run this again.';
  end if;
  v_people := array_remove(array[v_organizer, v_member, v_friend], null);

  -- Start over.
  delete from public.trips where invite_code = 'DEMO26';

  -- Act as the organizer, so authors and "done by" are filled in exactly as the app would fill them.
  perform set_config('request.jwt.claims', json_build_object('sub', v_organizer, 'role', 'authenticated')::text, true);

  insert into public.trips (name, destination, start_date, end_date, budget_cents, invite_code)
  values ('Smoky Mountains Weekend', 'Gatlinburg, TN', v_start, v_start + 3, 150000, 'DEMO26')
  returning id into v_trip;

  insert into public.trip_members (trip_id, user_id, role) values (v_trip, v_organizer, 'organizer');
  if v_member is not null then
    insert into public.trip_members (trip_id, user_id, role) values (v_trip, v_member, 'member');
  end if;
  if v_friend is not null then
    insert into public.trip_members (trip_id, user_id, role) values (v_trip, v_friend, 'member');
  end if;

  -- Itinerary: something later today (so a reminder can fire during a demo), then one stop per day.
  insert into public.itinerary_items (trip_id, day, title, time, location, notes, sort_order) values
    (v_trip, v_start, 'Check in to the cabin', '16:00', 'Laurel Ridge Cabin', 'Key code is in the host''s message.', 1),
    (v_trip, v_start, 'Dinner downtown', '19:00', 'Parkway, Gatlinburg', null, 2),
    (v_trip, v_start + 1, 'Pancake breakfast', '07:30', null, null, 1),
    (v_trip, v_start + 2, 'Lunch by the river', '13:30', 'Pigeon River', null, 2),
    (v_trip, v_start + 3, 'Check out', '11:00', 'Laurel Ridge Cabin', 'Leave the keys on the counter.', 1);
  insert into public.itinerary_items (trip_id, day, title, time, location, notes, sort_order)
  values (v_trip, v_start + 1, 'Alum Cave Trail hike', '08:30', 'Alum Cave trailhead', '5 miles round trip. Bring water and a snack.', 2)
  returning id into v_hike;
  insert into public.itinerary_items (trip_id, day, title, time, location, notes, sort_order)
  values (v_trip, v_start + 2, 'Whitewater rafting', '10:00', 'Hartford, TN', 'Wear clothes that can get wet.', 1)
  returning id into v_rafting;

  -- Expenses in integer cents, split evenly among everyone on the trip. Timestamps are spread
  -- out (everything in one statement would otherwise share the same time) so lists read naturally.
  insert into public.expenses (trip_id, paid_by, description, amount_cents, category, splits, created_at) values
    (v_trip, v_organizer, 'Cabin, 3 nights', 48000, 'lodging', pg_temp.demo_split(48000, v_people), now() - interval '9 days'),
    (v_trip, coalesce(v_friend, v_organizer), 'Rafting tickets', 21000, 'activities', pg_temp.demo_split(21000, v_people), now() - interval '5 days'),
    (v_trip, coalesce(v_member, v_organizer), 'Groceries', 8655, 'food', pg_temp.demo_split(8655, v_people), now() - interval '20 hours'),
    (v_trip, v_organizer, 'Gas for the drive', 6240, 'transport', pg_temp.demo_split(6240, v_people), now() - interval '3 hours');

  -- Checklist, some of it already done.
  insert into public.checklist_items (trip_id, title, category, assigned_to, done, created_at) values
    (v_trip, 'Hiking boots', 'packing', null, true, now() - interval '7 days'),
    (v_trip, 'Rain jackets', 'packing', null, false, now() - interval '7 days' + interval '1 minute'),
    (v_trip, 'Headlamps', 'packing', v_member, false, now() - interval '7 days' + interval '2 minutes'),
    (v_trip, 'Download offline maps', 'todo', v_organizer, true, now() - interval '6 days'),
    (v_trip, 'Pick up snacks for the hike', 'todo', coalesce(v_friend, v_member), false, now() - interval '6 days' + interval '1 minute'),
    (v_trip, 'Rafting reservation', 'booking', v_organizer, true, now() - interval '5 days'),
    (v_trip, 'Dinner table for Saturday', 'booking', null, false, now() - interval '5 days' + interval '1 minute');

  insert into public.trip_announcements (trip_id, body, created_at)
  values (v_trip, 'Welcome to the trip! We meet at the cabin at 4 PM today. Check the checklist for what to bring.', now() - interval '2 hours');

  insert into public.activity_comments (item_id, body, created_at)
  values (v_rafting, 'The outfitter says to bring a change of clothes and sandals with straps.', now() - interval '1 day');

  -- A reply from the member, if that account exists.
  if v_member is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    insert into public.activity_comments (item_id, body, created_at)
    values (v_hike, 'Should we pack lunch or eat after?', now() - interval '3 hours');
    insert into public.checklist_items (trip_id, title, category, done, created_at)
    values (v_trip, 'Sunscreen', 'packing', true, now() - interval '4 days');
    perform set_config('request.jwt.claims', json_build_object('sub', v_organizer, 'role', 'authenticated')::text, true);
    insert into public.activity_comments (item_id, body, created_at)
    values (v_hike, 'Pack lunch, there''s a great spot at the bluff.', now() - interval '2 hours');
  end if;

  raise notice 'Demo trip ready: "Smoky Mountains Weekend", invite code DEMO26, % member(s).', cardinality(v_people);
end;
$$;
