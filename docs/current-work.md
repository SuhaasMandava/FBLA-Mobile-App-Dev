# Current work

Update at the end of every session. Last updated: 2026-10-24, from `docs/planning/timeline.md`, README and the code. Build and device-test state was not checked.

## Now
- Preview builds and two-phone testing (Oct 23 to about Oct 30): install on two phones, run the two-phone test list, fix what it finds.

## Next
- Presentation rehearsal: 7-minute demo (README → Demo steps) and 3-minute Q&A; time each section.
- Prepare an offline backup (screen recording) in case venue internet fails.
- Gaps listed in `docs/planning/self-assessment.md`: evidence of pre-build planning, short usability sessions with real users.

## Done recently
- Oct 22: group features (announcements, comments, sharing, join links, organizer tools, live sync, reminders, quick add, intro), demo seed, graceful offline failure, planning docs.
- Oct 24: LICENSE names the TripHub team; rating-sheet self-assessment added; `docs/` notes created.

- Oct 25: trip completion built (not yet run on a device): "Mark as paid" settle-up payments (`supabase/migrations/010_settlements.sql`, `models/SettlementModel.ts`, `services/SettlementService.ts`, shared in `ExpenseContext`) and an end-of-trip `screens/TripSummaryScreen.tsx` (opened from Budget → Wrap Up). tsc, 243 jest tests and `test:db` pass; uncommitted.

- Oct 25: presentation prep notes written: [[demo-script]], [[qa-cheatsheet]], [[known-limits]], [[backup-plan]], [[usability-test-plan]]; [[self-assessment]] weakness list refreshed.

- Oct 25: audit fixes ([[bug-list-2026-10-25]]): migration 011, payee-only payments, web confirm dialogs, payments cache, vendored HIG skill untracked. tsc, 244 jest tests, `test:db` pass. Uncommitted. Run 010 and 011 in Supabase before device testing.

- Oct 25: Impeccable set up: `PRODUCT.md` (platform adaptive) and the design hook on (`.impeccable/config.json`). Uncommitted. If the hook doesn't fire after UI edits, run `/impeccable doctor`.

## Open notes
- `app.json` has no `extra.eas.projectId`, Android package or iOS bundle id yet. The first `eas init` / build adds them (README → Building a preview).

- Migration 010 must be run in Supabase before "Mark as paid" works (see [[human-todo]] section A and the new settle-up test in section C). `docs/planning/self-assessment.md` weakness #2 (completion) and #3 (LICENSE) are now stale; re-score after device testing.

## Unverified
- Whether any preview build has been run since README said none had.
- `CLAUDE.md` points to `.claude/commands/wrap-up.md`, which doesn't exist; the checklist is `docs/wrap-up.md`.

- Oct 25: UI/UX redesign started with the Trip Hub (`c7fec1c`, `fdc8072`): ticket hero, glance tiles, invite code tiles, Bricolage Grotesque titles, staggered entrance. tsc, lint, 247 tests, contrast check pass; checked in the browser at phone width, light and dark. Not checked on a real device or with a screen reader. Next: restyle Itinerary, Budget, Checklist, Settings and forms the same way (see [[screen-changelog]]).
- Oct 25: Itinerary, Budget, Checklist and Settings restyled to match the Trip Hub (see [[screen-changelog]]). Forms (add/edit screens, Welcome, Trip Settings, Summary) still use the old look plus the new fonts.
- Oct 26: Supabase migrations 006 to 011 run (all Success); "Confirm email" off, anonymous sign-ins turned off. Console 404s gone. Next: EAS preview build ([[human-todo]] section 2), then two-phone tests.
- Oct 26: EAS linked (projectId in app.json), preview env vars set, first Android preview build finished (apk link on expo.dev under suhaasmandava/triphub). Not yet installed or tested on a phone. Expo Go is the fallback for the demo (no reminders or invite links).
- Oct 26: demo phones are two iPhones, so the demo runs in Expo Go (no reminders or join links); the Android apk is unused. See [[human-todo]] section 2.
- Oct 26: upgraded Expo SDK 57 to 58 (RN 0.88, React 19.3, Node 24 ok) on merged branch `sdk-58-upgrade`, because the App Store Expo Go only opens the latest SDK. tsc, lint, 247 tests, `test:db`, expo-doctor 20/20 pass; web loads and signs in. Not yet opened in Expo Go on an iPhone. The tester account has no trips now (QA Trip gone).
- Oct 26: Claude verified the single-user flows on web (see [[human-todo]] section 0). Found: `tester@example.com` has no profiles row so it cannot create trips; use a new account. Two-user tests still need the two iPhones.
- Oct 26: rubric audit; closed the "account controls" gap: Settings → Your Name (`screens/EditNameScreen.tsx`, `hooks/useDisplayNameForm.ts`) and Delete Account (`delete_my_account()` in `supabase/migrations/012_account_controls.sql`, `AuthService.deleteAccount`), plus a "how splits work" line on the expense form. tsc, lint (app folders), 249 tests, `test:db` pass. Run migration 012 in Supabase before testing Delete Account. Not device-tested. Still open from [[self-assessment]]: usability sessions, two-phone tests, rehearsal, restyling the forms.

- Oct 26: README rewritten for judges and non-coders; old README moved to [[technical-reference]]. Home screenshots added (3, dark mode); all four tabs added (Home 3, others 2 each); Settings and light/dark added (3); optional extras (large text, trip summary, comments) not taken (`docs/screenshots/`, see its README). Re-check README claims (249 tests, features) after device testing.
- Oct 26: migration 012 run in Supabase (Success). Delete Account and Your Name still to be tried with a throwaway account.
- Oct 26: everything committed and pushed to origin/main (cafdc39): redesign, SDK 58 upgrade, Reveal width fix, notes. Local-only branches: `sdk-58-upgrade` (merged), `budget-tab`, `backup-before-rebase`. `docs/Untitled.base` and `Untitled.canvas` are empty Obsidian scratch files, not committed.
