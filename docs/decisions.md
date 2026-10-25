# Decisions

One entry per decision: what, why. Newest at the bottom. Dates come from `docs/planning/timeline.md`.

- **Expo + React Native + Supabase** (Sep 21): one TypeScript codebase for iOS and Android, hosted Postgres with auth, realtime and Row Level Security.
- **MVVM structure** (Sep 21): rules testable without React or a network; maps to the rating sheet's architecture item. Providers act as the view models.
- **Security in the database, not just the app** (Oct 10-12): RLS on every table; joining goes through a database function so non-members can't read trips. Details in README → Row Level Security.
- **Validation at two levels** (Oct): zod in the app plus constraints/triggers in Postgres, so rules hold if the app is bypassed.
- **Offline cache per user** (Oct 12): keyed by user id, cleared on sign-out (`context/AuthContext.tsx`) and when leaving or deleting a trip (`hooks/useTripManagement.ts`), so data never leaks between accounts.
- **Design tokens + shared components** (Oct 14): consistent look; contrast checked in light and dark.
- **Integer cents for money** (Oct 15): no rounding errors; settle-up yields the fewest payments.
- **Offline edits are refused, not queued** (README → Offline behavior): avoids conflict handling; the message says a connection is needed.
- **Live sync via Supabase Realtime** (Oct 22): other phones' changes appear without refresh; falls back to pull-to-refresh and reload on reconnect if Realtime is unavailable.
- **Share posts never include the invite code** (Oct 22): public X posts can't leak access (`services/ShareService.ts`). WhatsApp/Messages invites do include it.
- **No QR codes** (Oct 22): judges may not scan or click links; invites are shown as codes on screen, plus `triphub://join/CODE` links.
- **Invite codes: 6 characters from a 31-character alphabet without 0/O/1/I/L** (`utils/inviteCode.ts`): codes are read aloud and typed by hand; random bytes are rejection-sampled to avoid bias.
- **Dev bypass sign-in** (`services/DevBypass.ts`): goes through real auth for fast local testing; `__DEV__` only, so release bundles drop it.
- **Settle-up payments are a separate `settlements` table** (Oct 25): balances = expenses + recorded payments, so expenses stay untouched and a payment can be undone. Payer, payee or an organizer may record/undo; rows are never edited. Settlements load quietly in `ExpenseContext` (a failure, e.g. migration not run, is logged not shown).
