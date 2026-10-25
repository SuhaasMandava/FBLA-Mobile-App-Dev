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
  -- The same definition Supabase uses: the signed-in user comes from the request's JWT claims.
  create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
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
  await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${uid}"}', false);`);
  try {
    return { rows: (await db.query(sql, params)).rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
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

console.log('\nSettlements (010)');
const pay = `insert into public.settlements (trip_id, from_user, to_user, amount_cents) values ($1, $2, $3, `;
await refused('a payer cannot record their own payment', ALEX, `${pay}2500)`, /row-level security/, [trip.id, ALEX, SAM]);
await rows('a payee records a payment', SAM, `${pay}2500) returning *`, 1, [trip.id, ALEX, SAM]);
await rows('an organizer records one for others', SAM, `${pay}100) returning *`, 1, [trip.id, ALEX, SAM]);
await refused('an outsider cannot record one', JO, `${pay}100)`, /row-level security|settlement_member_not_on_trip/, [trip.id, ALEX, SAM]);
await refused('zero amounts are refused', SAM, `${pay}0)`, /check constraint/, [trip.id, ALEX, SAM]);
await refused('paying yourself is refused', ALEX, `${pay}100)`, /check constraint/, [trip.id, ALEX, ALEX]);
await refused('both people must be on the trip', SAM, `${pay}100)`, /settlement_member_not_on_trip/, [trip.id, JO, SAM]);
await refused('a payment cannot be edited', ALEX, `update public.settlements set amount_cents = 1`, /permission denied/);
await rows('an outsider reads none', JO, `select * from public.settlements`, 0);
await rows('a member reads them', ALEX, `select * from public.settlements`, 2);
await rows('a payer undoes their payment', ALEX, `delete from public.settlements where amount_cents = 2500 returning id`, 1);
await rows('a payee undoes theirs', SAM, `delete from public.settlements returning id`, 1);

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
await rows('a member logs an expense', JO, `insert into public.expenses (trip_id, paid_by, description, amount_cents, splits) values ($1, $2::uuid, 'Taxi', 1000, jsonb_build_object($2::text, 1000)) returning *`, 1, [trip.id, JO]);
await rows('an organizer removes a member', ALEX, `delete from public.trip_members where trip_id = $1 and user_id = $2 returning *`, 1, [trip.id, JO]);
await rows('an expense of someone who left can still be renamed', ALEX, `update public.expenses set description = 'Airport taxi' where paid_by = $1::uuid returning *`, 1, [JO]);
await refused('but its split cannot be changed to include them again', ALEX, `update public.expenses set amount_cents = 2000, splits = jsonb_build_object($1::text, 2000) where paid_by = $1::uuid`, /payer_not_member/, [JO]);
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

console.log('\nLive updates (009)');
const published = (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime'`)).rows.map(
  (r) => r.tablename,
);
for (const table of ['itinerary_items', 'expenses', 'checklist_items', 'trip_announcements', 'activity_comments', 'settlements']) {
  check(`${table} is in the realtime publication`, published.includes(table), published.join(', '));
}

console.log('\nSigned-out visitors');
for (const table of ['trips', 'trip_members', 'itinerary_items', 'expenses', 'checklist_items', 'trip_announcements', 'activity_comments', 'settlements']) {
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

console.log('\nDemo seed (supabase/seed/demo_trip.sql)');
const seed = readFileSync(join(root, 'supabase/seed/demo_trip.sql'), 'utf8');
let seedError = null;
try {
  await db.exec(seed);
} catch (e) {
  seedError = e.message;
}
check('explains what to do when the demo organizer account is missing', /Create it in the app first/.test(seedError ?? ''), seedError ?? 'ran');
const ORGANIZER = '00000000-0000-0000-0000-0000000000d1';
const MEMBER = '00000000-0000-0000-0000-0000000000d2';
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'demo.organizer@example.com', '{"display_name":"Riley"}')`, [ORGANIZER]);
async function seedCounts() {
  const [row] = (await db.query(`select t.id,
    (select count(*) from public.trip_members m where m.trip_id = t.id)::int as members,
    (select count(*) from public.itinerary_items i where i.trip_id = t.id)::int as activities,
    (select count(*) from public.expenses e where e.trip_id = t.id)::int as expenses,
    (select coalesce(sum(e.amount_cents), 0) from public.expenses e where e.trip_id = t.id)::int as spent,
    (select count(*) from public.checklist_items c where c.trip_id = t.id)::int as checklist,
    (select count(*) from public.checklist_items c where c.trip_id = t.id and c.done and c.completed_by is not null)::int as done_by_someone,
    (select count(*) from public.trip_announcements a where a.trip_id = t.id and a.created_by is not null)::int as announcements,
    (select count(*) from public.activity_comments c where c.trip_id = t.id)::int as comments
    from public.trips t where t.invite_code = 'DEMO26'`)).rows;
  return row;
}
await db.exec(seed);
const soloSeed = await seedCounts();
check('seeds a trip with only the organizer account', soloSeed?.members === 1 && soloSeed.activities === 7 && soloSeed.expenses === 4 && soloSeed.checklist === 7, JSON.stringify(soloSeed));
check('authors and "done by" are filled in as the organizer', soloSeed?.announcements === 1 && soloSeed.done_by_someone === 3, JSON.stringify(soloSeed));
await db.query(`insert into auth.users (id, email) values ($1, 'demo.member@example.com')`, [MEMBER]);
await db.exec(seed);
const pair = await seedCounts();
check('re-running replaces the old demo trip (one trip, more people)', pair?.members === 2 && pair.id !== soloSeed.id, JSON.stringify(pair));
check('the second account gets a reply thread and its own tick', pair?.comments === 3 && pair.checklist === 8, JSON.stringify(pair));
check('money stays in integer cents and adds up', pair?.spent === 48000 + 21000 + 8655 + 6240, String(pair?.spent));
const [{ n: oldLeft }] = (await db.query(`select count(*)::int as n from public.trips where id = $1`, [soloSeed.id])).rows;
check('nothing from the previous demo trip is left', oldLeft === 0);
await rows('the demo organizer sees the trip through the normal rules', ORGANIZER, `select * from public.trips where invite_code = 'DEMO26'`, 1);
await rows('the member sees the same expenses', MEMBER, `select * from public.expenses where trip_id = $1`, 4, [pair.id]);

console.log(failures === 0 ? '\nAll database checks passed.' : `\n${failures} database check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
