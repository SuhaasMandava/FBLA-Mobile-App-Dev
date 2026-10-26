# Conventions

## Commands
```bash
npx expo start          # dev server (restart after changing .env)
npx expo lint .         # lint. Bare `npx expo lint` only checks components/ (README)
npx tsc --noEmit        # typecheck
npm test                # unit tests (jest-expo): models/ and utils/
npm run test:db         # database rules in in-memory Postgres (PGlite), scripts/test-database.mjs
npm run check:contrast  # WCAG contrast of color tokens, light and dark
npx expo install <pkg>  # always use this to add packages
```
Run lint, typecheck and tests before calling a task done.

## Rules
- Expo SDK 58 (React Native 0.88, React 19.3). Expo APIs change every SDK: check `https://docs.expo.dev/versions/v58.0.0/` before touching Expo, EAS or RN APIs.
- Money is integer cents, never floats (`utils/money.ts` parses dollar strings by digits).
- Validate twice: zod in `models/*Form.ts` (syntax + semantics) and again in Postgres (constraints/triggers in a migration).
- Every database change is a new numbered migration in `supabase/migrations/`, safe to re-run, with Row Level Security, covered by `npm run test:db`. Don't edit old migrations.
- Only the Supabase anon key is in the app (public by design; RLS protects data). `.env` is git-ignored. Read env vars as static `process.env.EXPO_PUBLIC_*` (`services/supabase.ts`).
- Reads work offline; offline writes are refused with a clear message, not queued.
- Accessibility: screen-reader labels, 44 pt touch targets, large-text layouts (`hooks/useLargeText.ts`), color is never the only signal.
- Use tokens from `theme/theme.ts` and shared components in `components/`. No ad-hoc colors or spacing.
- `ios/` and `android/` don't exist (generated). Configure in `app.json`.
- No Claude/Co-Authored-By attribution in commits or PRs (`CLAUDE.md`).

## Definition of done (per feature)
Migration + RLS + db test → zod model + unit tests → service → hook/context → screens → README updated. Typecheck, lint and tests pass. Source: `docs/planning/timeline.md`.

- Product context lives in root `PRODUCT.md` (Impeccable); the design detector hook is enabled in `.impeccable/config.json`; `config.local.json` is git-ignored. Decisions: [[decisions]].
- Impeccable (design plugin) runs inside the same Claude session, so it already has the Obsidian MCP. `PRODUCT.md` → Operating Context tells it which notes to read and where to record changes. Deny list stays: no `vault_delete`, no `command_execute` (`.claude/settings.json`).

- Titles and numerals use the display font through type roles (`AppText variant`), never a raw `fontFamily`. New animated entrances go through `Reveal` so Reduce Motion is honored. Any new third-party asset gets a row in `docs/references/index.md` (name, URL, license) in the same change.
