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
- Obsidian MCP (`.mcp.json`) must use the plugin's HTTP port 27123, not HTTPS 27124: Claude Code rejects the plugin's self-signed cert ("unsupported name constraint type"). Needs `OBSIDIAN_API_KEY` set as a user env var, and the plugin's "Enable HTTP server" on. Vault root is `docs/`, so MCP paths are `index.md`, not `docs/index.md`.
- **Bash heredocs with SQL/TS containing quotes failed in this shell ("unexpected EOF")** → write files with the Write tool, and use Python for scripted multi-edits; `scripts/test-database.mjs` edits must match the real `'\n'` escape in the source.
- **`npx expo lint .` floods with thousands of errors** → a generated bundle (web export output) is in the tree; lint the source folders instead (`npx expo lint screens context models services utils scripts`) or delete the export folder.
- **db test: an outsider's insert fails with the trigger message, not an RLS message** → BEFORE triggers run first and the outsider can't read `trip_members`; accept either pattern (`scripts/test-database.mjs`, Settlements block).
