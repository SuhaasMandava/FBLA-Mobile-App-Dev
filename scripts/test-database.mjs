// Tests the database rules without touching a real Supabase project.
//
// Loads supabase/schema.sql and every migration into an in-memory Postgres (PGlite),
// with a small stand-in for Supabase's `auth` schema and roles, then acts as different
// users (an organizer, a member, an outsider, a signed-out visitor) and checks that Row
// Level Security, the column grants and the triggers allow and refuse what the README says.
//
// Run with: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite();

// --- A stand-in for what Supabase provides: roles, auth.users, auth.uid(), default grants.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create or replace function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  create publication supabase_realtime;
`);

// --- Schema and migrations, in order, twice (each file promises to be safe to re-run).
const migrationsDir = join(root, 'supabase/migrations');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
await db.exec(readFileSync(join(root, 'supabase/schema.sql'), 'utf8'));
for (const pass of ['apply', 're-run']) {
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    } catch (e) {
      console.error(`${pass} failed in ${file}: ${e.message}`);
      process.exit(1);
    }
  }
}
console.log(`Applied and re-ran ${files.length} migrations.\n`);

const SAM = '00000000-0000-0000-0000-000000000001'; // creates the trip: organizer
const ALEX = '00000000-0000-0000-0000-000000000002'; // joins: member
const JO = '00000000-0000-0000-0000-000000000003'; // not on the trip
for (const [id, name] of [[SAM, 'Sam'], [ALEX, 'Alex'], [JO, 'Jo']]) {
  await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, jsonb_build_object('display_name', $2::text))`, [id, name]);
}

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` (${detail})`}`);
  if (!ok) failures += 1;
}

/** Run one statement as a signed-in user, the way the API does: role `authenticated` plus their id. */
async function as(uid, sql, params = []) {
  await db.exec(`set role authenticated; select set_config('app.uid', '${uid}', false);`);
  try {
    return { rows: (await db.query(sql, params)).rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec(`reset role; select set_config('app.uid', '', false);`);
  }
}
async function refused(label, uid, sql, pattern, params) {
  const r = await as(uid, sql, params);
  check(label, !!r.error && pattern.test(r.error), r.error ?? `allowed, ${r.rows.length} row(s)`);
}
async function rows(label, uid, sql, count, params) {
  const r = await as(uid, sql, params);
  check(label, !r.error && r.rows.length === count, r.error ?? `${r.rows.length} row(s)`);
  return r.rows ?? [];
}

// --- Setup: Sam's trip, Alex joins with the code, Jo stays out.
const [trip] = await rows('create_trip makes the caller organizer', SAM,
  `select * from public.create_trip('Beach week', 'Maui', '2026-07-01', '2026-07-07', 150000, 'K7M9PQ')`, 1);
await rows('join_trip_by_code adds a member', ALEX, `select * from public.join_trip_by_code('k7m9pq')`, 1);
const [item] = await rows('a member adds an activity', ALEX,
  `insert into public.itinerary_items (trip_id, day, title) values ($1, '2026-07-03', 'Hike') returning *`, 1, [trip.id]);

console.log('\nAnnouncements (007)');
await rows('an organizer posts', SAM, `insert into public.trip_announcements (trip_id, body) values ($1, 'Meet at 8') returning *`, 1, [trip.id]);
await refused('a member cannot post', ALEX, `insert into public.trip_announcements (trip_id, body) values ($1, 'Hi')`, /row-level security/, [trip.id]);
await refused('nobody can set the author', SAM, `insert into public.trip_announcements (trip_id, body, created_by) values ($1, 'x', $2)`, /permission denied/, [trip.id, ALEX]);
await refused('more than 500 characters is refused', SAM, `insert into public.trip_announcements (trip_id, body) values ($1, repeat('x', 501))`, /check constraint/, [trip.id]);
await refused('blank text is refused', SAM, `insert into public.trip_announcements (trip_id, body) values ($1, '   ')`, /check constraint/, [trip.id]);
await rows('a member reads them', ALEX, `select * from public.trip_announcements`, 1);
await rows('an outsider reads none', JO, `select * from public.trip_announcements`, 0);
await refused('they cannot be edited', SAM, `update public.trip_announcements set body = 'changed'`, /permission denied/);
await rows('a member cannot delete one', ALEX, `delete from public.trip_announcements returning id`, 0);
await rows('an organizer deletes one', SAM, `delete from public.trip_announcements returning id`, 1);

console.log('\nActivity comments (007)');
const [comment] = await rows('a member comments', ALEX,
  `insert into public.activity_comments (item_id, body) values ($1, 'Bring water') returning *`, 1, [item.id]);
check('the trigger fills in the trip, the default fills in the author', comment?.trip_id === trip.id && comment?.created_by === ALEX);
await refused('an outsider cannot comment', JO, `insert into public.activity_comments (item_id, body) values ($1, 'hi')`, /activity_not_found/, [item.id]);
await refused('the trip cannot be sent', ALEX, `insert into public.activity_comments (item_id, trip_id, body) values ($1, $2, 'hi')`, /permission denied/, [item.id, trip.id]);
await refused('comments cannot be edited', ALEX, `update public.activity_comments set body = 'changed'`, /permission denied/);
await rows('an outsider reads none', JO, `select * from public.activity_comments`, 0);
await as(SAM, `insert into public.activity_comments (item_id, body) values ($1, 'Organizer note')`, [item.id]);
await rows("a member cannot delete someone else's comment", ALEX, `delete from public.activity_comments where created_by = $1 returning id`, 0, [SAM]);
await rows("an organizer deletes a member's comment", SAM, `delete from public.activity_comments where id = $1 returning id`, 1, [comment.id]);
await rows('an author deletes their own comment', SAM, `delete from public.activity_comments where created_by = $1 returning id`, 1, [SAM]);
await as(ALEX, `insert into public.activity_comments (item_id, body) values ($1, 'Still here')`, [item.id]);

console.log('\nOrganizer tools (004, 008)');
await refused('the last organizer cannot leave', SAM, `delete from public.trip_members where trip_id = $1 and user_id = $2`, /last_organizer/, [trip.id, SAM]);
await refused('a member cannot make anyone organizer', ALEX, `select public.make_trip_organizer($1, $2)`, /not_permitted/, [trip.id, ALEX]);
await refused('an outsider cannot either', JO, `select public.make_trip_organizer($1, $2)`, /not_permitted/, [trip.id, JO]);
await refused('only members can be made organizer', SAM, `select public.make_trip_organizer($1, $2)`, /member_not_found/, [trip.id, JO]);
await rows('roles cannot be changed directly', SAM, `update public.trip_members set role = 'organizer' where user_id = $1 returning *`, 0, [ALEX]);
await rows('an organizer makes a member organizer', SAM, `select public.make_trip_organizer($1, $2)`, 1, [trip.id, ALEX]);
await rows('with another organizer, the first can leave', SAM, `delete from public.trip_members where trip_id = $1 and user_id = $2 returning *`, 1, [trip.id, SAM]);
await refused('the new sole organizer cannot leave', ALEX, `delete from public.trip_members where trip_id = $1 and user_id = $2`, /last_organizer/, [trip.id, ALEX]);
await refused("new dates must cover every activity", ALEX, `update public.trips set end_date = '2026-07-02' where id = $1`, /activities_outside_dates/, [trip.id]);
await rows('dates that cover every activity are saved', ALEX, `update public.trips set start_date = '2026-07-02', end_date = '2026-07-05' where id = $1 returning *`, 1, [trip.id]);
await rows('renaming skips the date check', ALEX, `update public.trips set name = 'Beach week!' where id = $1 returning *`, 1, [trip.id]);
await rows('someone who left cannot edit the trip', SAM, `update public.trips set name = 'Hijack' where id = $1 returning *`, 0, [trip.id]);
await as(JO, `select * from public.join_trip_by_code('K7M9PQ')`);
await rows('a member cannot remove another member', JO, `delete from public.trip_members where trip_id = $1 and user_id = $2 returning *`, 0, [trip.id, ALEX]);
await rows('an organizer removes a member', ALEX, `delete from public.trip_members where trip_id = $1 and user_id = $2 returning *`, 1, [trip.id, JO]);
await rows('a removed member sees nothing', JO, `select * from public.itinerary_items where trip_id = $1`, 0, [trip.id]);

console.log('\nDeleting');
await as(ALEX, `insert into public.checklist_items (trip_id, title, category) values ($1, 'Sunscreen', 'packing')`, [trip.id]);
await rows('a non-member cannot delete the trip', JO, `delete from public.trips where id = $1 returning id`, 0, [trip.id]);
await rows('an organizer deletes the trip', ALEX, `delete from public.trips where id = $1 returning id`, 1, [trip.id]);
const [left] = (await db.query(`select
  (select count(*) from public.trip_members where trip_id = $1)::int as members,
  (select count(*) from public.itinerary_items where trip_id = $1)::int as activities,
  (select count(*) from public.activity_comments where trip_id = $1)::int as comments,
  (select count(*) from public.checklist_items where trip_id = $1)::int as checklist`, [trip.id])).rows;
check('everything on the trip goes with it (the last-organizer rule allows this)', Object.values(left).every((n) => n === 0), JSON.stringify(left));
const [solo] = (await as(JO, `select * from public.create_trip('Solo trip', 'Rome', '2026-08-01', '2026-08-03', 1000, 'ABC234')`)).rows;
let accountError = null;
try {
  await db.query(`delete from auth.users where id = $1`, [JO]);
} catch (e) {
  accountError = e.message;
}
check("deleting the account of a trip's only organizer still works", accountError === null, accountError ?? '');
const [{ n: soloMembers }] = (await db.query(`select count(*)::int as n from public.trip_members where trip_id = $1`, [solo.id])).rows;
check('their membership goes with the account', soloMembers === 0);

console.log('\nSigned-out visitors');
for (const table of ['trips', 'trip_members', 'itinerary_items', 'expenses', 'checklist_items', 'trip_announcements', 'activity_comments']) {
  await db.exec('set role anon;');
  let error = null;
  try {
    await db.query(`select * from public.${table}`);
  } catch (e) {
    error = e.message;
  }
  await db.exec('reset role;');
  check(`cannot read ${table}`, error !== null, 'read succeeded');
}

console.log(failures === 0 ? '\nAll database checks passed.' : `\n${failures} database check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
