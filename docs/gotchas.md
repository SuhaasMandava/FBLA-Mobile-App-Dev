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
- **On web, Delete Trip / Leave / Mark as paid do nothing (no confirm shows)** → `utils/confirm.ts` uses `Alert.alert`, which is a no-op in react-native-web. Native is fine; add a `Platform.OS === 'web'` branch with `window.confirm` if web testing matters. Don't expect to delete test trips from the browser.
- **One realtime channel per `useLiveSync` call** → a table missing from the publication (e.g. migration not run) fails the whole channel. Keep optional tables (`settlements`) on their own call, as in `ExpenseContext.tsx`.
- **Browser testing: `tester@example.com` dev bypass writes to the real Supabase project** → test trips persist. The connected project was missing migrations 006, 007 and 010 on Oct 25 (checklist and announcements show "Couldn't load", payments are ignored).
- **`expo lint` reports a parse error you already fixed** → its cache (`.expo/cache/eslint`) is stale; run `npx eslint <folders> --no-cache`.
- **Python edit scripts: `'\\n'` inside a triple-quoted string wrote a real newline into a TS string literal** (broke `utils/confirm.ts`) → build such strings with `chr(92)` or use the Edit tool.
- **Postgres tests: `$2` used twice needs a cast** (`$2::uuid`) or PGlite says "inconsistent types deduced for parameter".

- **Custom font plus `fontWeight` looks wrong or falls back on Android** → each weight is its own family (`BricolageGrotesque_700Bold`); display type roles set `fontFamily` only (`theme/theme.ts`).
- **Hot reload shows `ReferenceError: TripHero is not defined` after a big edit** → stale bundle mid-edit; reload the page. Not a real error once `tsc` passes.
- **A bash heredoc holding a Python script with quotes and apostrophes failed** → in this shell use the Write tool for files and `python3 - <<'PYEOF'` for edits.
- **Web console shows 404 `PGRST205` for settlements, checklist, announcements, comments** → the connected Supabase project lacks migrations 006 to 011 ([[human-todo]] A). Expected until they are run.
- **Prettier without a config rewrites whole files (double quotes, 80 columns)** -> `.prettierrc` now holds the project style; run `npx prettier --write <file>` only with it present.
- **Supabase "Allow anonymous sign-ins" was ON (Oct 26)** → the app doesn't use it; anonymous users get the `authenticated` role, so keep it off to reduce abuse (Authentication → Sign In / Providers).
- **`eas build` ends with "adb executable doesn't seem to work" / "build command failed"** → only the optional "run on an emulator?" prompt (answer no); the build itself finished and the apk link is valid. `env:create` is deprecated: use `eas env:set --name X --value Y`; `--name` takes the variable name, not the value.
- **Expo Go (App Store) says "Project is incompatible" and only the newest SDK works on iOS** → upgrade the project (`npm install expo@^58.0.0`, `npx expo install --fix`, `npx expo-doctor`), keep SDK == current Expo Go. RN 0.88 types: `Ref<TextInput>` became `Ref<ComponentRef<typeof TextInput>>`, `onSubmitEditing={form.submit}` needs `() => void form.submit()`, `Linking.getInitialURL` can resolve `undefined`.
- **Empty state text and buttons ran off both edges of the screen on iPhone (Expo Go)** → an Animated wrapper (`Reveal`) inside a centered column shrank to its content width; it now sets `alignSelf: "stretch"` (`components/Reveal.tsx`). Web did not show it, so check new wrappers on a phone.
- **Creating a trip fails with "Something went wrong"; console: `Key (user_id) is not present in table "profiles"` (23503)** → that auth user has no `profiles` row (the signup trigger `on_auth_user_created` did not run for it; seen on `tester@example.com`, Oct 26). A fresh sign-up works. Fix by inserting the row in Supabase or using a new account.
- `npx expo lint .` also lints `docs/.obsidian/plugins/*` (thousands of errors); lint the app folders instead: `npx eslint screens services models hooks context components scripts`.

- Root README embeds `docs/screenshots/{home,itinerary,budget,checklist}.png`; until those files exist the images show as broken. Add them (names in `docs/screenshots/README.md`) before submitting. Links into the manual use `docs/technical-reference.md#anchor`.
- Files here use CRLF line endings. Scripted edits with multi-line string matches silently fail to match; use the Edit tool or normalize first. Writing `\n` inside a JS string via Python must be `\n`, or the string breaks across lines.
- "Success. No rows returned" in the Supabase SQL editor is the normal result for migrations (they create objects, they don't select rows).
- Screenshots taken in Expo Go show a blue floating gear button (Expo's dev menu). Hide it in Expo Go's own settings before taking README or slide shots (done for the Home shots).
- **Itinerary stop cards about 1100 px tall on iPhone (Expo Go, RN 0.88), fine on web** → `DottedLine` rendered 80 dots (about 560 px) as flow content, and RN 0.88 on iOS counted that toward the row height. It is now absolutely positioned and only fills the space it is given (`components/Route.tsx`). Any "decorative filler" made of many children needs `position: absolute` or an overflow-hidden fixed-size parent.
- Commit only what you changed: the working tree often holds unrelated edits and scratch files (`docs/Untitled.base`, `docs/Untitled.canvas`). README work was committed as `9d8841b` by adding explicit paths, not `git add -A`.
