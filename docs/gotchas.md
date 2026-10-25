# Gotchas

Bugs, quirks and failed approaches. One or two lines each, newest at the bottom. Format: **symptom** → cause/fix (file).

- **Lint passes but only checked `components/`** → run `npx expo lint .`, not bare `npx expo lint` (README → Getting started).
- **Sign-up never completes** → Supabase "Confirm email" must be off (Authentication → Providers → Email). Anonymous sign-ins aren't used.
- **App shows "TripHub isn't set up yet"** → `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` missing. Locally: `.env`, then restart `expo start`. EAS builds don't upload `.env`: set both with `eas env:set` for `preview` / `production` (README → Building a preview).
- **Env var is `undefined` in a build** → `process.env.EXPO_PUBLIC_*` must be a static dot-notation reference, not destructured or dynamic (`services/supabase.ts`).
- **Reminders and invite links don't work in Expo Go** → they need a preview or dev build (`eas.json` profile `preview`).
- **Live updates never start** → `supabase/migrations/009_live_sync.sql` adds the tables to the realtime publication; without it the app silently falls back to pull-to-refresh.
- **A migration fails `npm run test:db`** → `scripts/test-database.mjs` applies the schema and every migration twice, so each file must be safe to re-run.
- **Saved data has the wrong shape after a model change** → bump `PREFIX` in `services/CacheService.ts`.
- **Demo seed fails or shows nothing** → create `demo.organizer@example.com` in the app first, then run `supabase/seed/demo_trip.sql` on a test project only (README → Demo mode).
