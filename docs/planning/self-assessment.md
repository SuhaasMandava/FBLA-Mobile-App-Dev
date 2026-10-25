# Rating sheet self-assessment

Our own scoring of TripHub against the 2026–2027 Mobile Application Development rating sheet ([FBLA event page](https://www.fbla.org/competitive-events/mobile-application-development/)), as of October 22, 2026. It's honest rather than hopeful: where a score depends on something not yet tested on real phones, it says so. Re-score after device testing and each rehearsal.

## Automated checks (all passing)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | No type errors |
| `npx expo lint .` | No problems |
| `npm test` | 16 suites, 234 tests passed |
| `npm run test:db` | Every migration applies and re-runs; all RLS, trigger, realtime and demo-seed checks pass (in-memory Postgres) |
| `npm run check:contrast` | All color pairs pass WCAG |
| `npx expo-doctor` | 21/21 checks passed |
| `npx expo export` (web; Android and iOS) | Both succeed; release bundles contain no dev-only test account |

## Scores

| Rating sheet item | Max | Our score | Why, and what would raise it |
| --- | --- | --- | --- |
| Planning process | 10 | 9 | Timeline, wireframes, user journey, requirements map, design audit, definition of done. Missing: anything from before the build (early sketches, meeting notes); add photos or notes if they exist. |
| Classes, modules, components | 5 | 5 | Typed models, one service per area, a shared component library on design tokens. |
| Mobile architectural patterns | 5 | 5 | MVVM with a diagram; services isolate Supabase and device APIs. Be ready to explain why providers are the view models. |
| Innovation and creativity | 5 | 4–5 | Live sync across phones, fewest-payments settle-up, paste-a-list quick add, join links that survive sign-up, the Route motif. Subjective; show it in motion. |
| UX design: journey, rationale, accessibility | 5 | 4 | Journey and rationale are documented, accessibility is built in. No usability test with real users yet; three short sessions with notes would make it a 5. Screen readers not yet tried on devices. |
| Intuitive, or clear instructions | 5 | 4 | First-run intro (replayable), helpful empty states, field hints. The intro covers invites only; a short "how splits work" tip on the expense form would help. |
| Icons and graphics | 5 | 5 | Team's own icon, integrated into the splash, empty states and the Route throughout the app. |
| Input validated (syntactic and semantic) | 5 | 5 | Every form has both, in tested zod models, repeated by database constraints and triggers. |
| Addresses all parts of the prompt | 10 | 8–9 | Every topic area has a complete feature, and the correlation is explained in the README. Weakest area: **completion**. Settle-up shows who pays whom, but payments can't be marked as made, so balances never reach zero, and there's no end-of-trip recap. |
| Integrated with social media | 5 | 5* | WhatsApp and X open directly with the message or post filled in; Messages and the share sheet too. *Not yet tried on a real phone. |
| Data handling and storage | 5 | 5 | RLS on every table with tests, column grants, server-stamped authors, integer cents, per-user cache cleared on sign-out and when leaving a trip, timeouts. Gaps judges might ask about: no in-app account deletion, and the offline cache isn't encrypted (it holds trip data, never passwords). |
| Documentation and copyright compliance | 5 | 4 | README, credits and licenses for every dependency, trademark notice, sources. Becomes a 5 once `LICENSE` names the team instead of the Expo template and the vendored `.claude/skills` content is removed from the submitted copy. |
| Presentation delivery: organization | 10 | — | Depends on rehearsal. The demo script in the README fits 7 minutes only if practiced; cut step 6 if running long. |
| Confidence, body language, eye contact, voice | 10 | — | Rehearse with a timer and someone playing judge. |
| Answering questions | 10 | — | Likely questions: why Supabase, how RLS works, how settle-up works, what happens offline, how you'd add push notifications, accessibility choices. |
| Adherence to guidelines | 10 | — | Plan: three devices at most (two phones and a laptop), phones fully charged (no power at preliminaries), no QR codes or links for judges to open, a screen recording as backup in case venue internet fails. |
| **App and documentation subtotal** | **70** | **63–67** | Before device testing. |

## What's still weak, most important first

Updated Oct 25. Talking points for each are in [[known-limits]]; usability sessions are planned in [[usability-test-plan]].

1. **Nothing has run on a real phone yet.** Reminders and alerts, invite links, WhatsApp/Messages/X, live sync and the EAS preview build all need the two-phone test list. Migrations 007–010 have only run in the in-memory test database, not the Supabase project.
2. ~~Trip completion~~ **Done Oct 25:** "Mark as paid" settle-up payments and the Trip Summary screen (migration 010). Not yet device-tested, so "Addresses all parts of the prompt" stays 8–9 until it is.
3. ~~LICENSE~~ **Done Oct 24:** names the TripHub team.
4. **Vendored Apple HIG content** in `.claude/skills/apple-design/` should be removed from the submitted repository.
5. **No usability testing evidence.** Three sessions, five tasks each, with notes and one change made because of them ([[usability-test-plan]]).
6. **Account controls.** No way to change your display name or delete your account in the app.
7. **Reminders and alerts are local.** Alerts only appear while TripHub is running, and reminders are scheduled for the open trip. Real push notifications would need a server function; explain this as a known limit if asked.
8. **Dependency advisories.** `npm audit` reports advisories in the Expo/React Native toolchain (for example in `react-devtools-core`, a development tool). They come from upstream SDK packages, not TripHub's code; forcing fixes would break the SDK. Re-check after the next Expo SDK patch.
9. **Expo Router.** The project guide prefers Expo Router; TripHub uses React Navigation directly. Not a rating-sheet item, and switching now would be risky; mention it only if asked.

Update Oct 25 (later): item 4 (vendored Apple HIG content) is now untracked and git-ignored; the files remain only on this computer. Delete the `tester@example.com` account before submission ([[bug-list-2026-10-25]]).
