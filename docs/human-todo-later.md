---
tags: [triphub, todo, manual, later]
created: 2026-10-26
---
# Human to-do (later: demo, presentation, submission)

Parked until the app is built and tested. Not needed now. The current list is [[human-todo]]. Context: [[current-work]].

## Demo safety net
- [ ] Demo runs in Expo Go on two iPhones (an installed iOS build needs a paid Apple Developer account, $99/year). Reminders and join links don't work there: say so, and show them in the backup video. The Android apk built on Oct 26 is unused
- [ ] Reset the seed trip on presentation day (re-run `supabase/seed/demo_trip.sql`)
- [ ] Record a backup demo video (see [[backup-plan]]); keep it on the laptop and a phone
- [ ] Practice on a phone hotspot (venue Wi-Fi may fail)
- [ ] Use the app the day before the event (free Supabase projects pause after about a week idle)
- [ ] Set `production` EAS env vars too if you ever build the production profile

## Rehearse and present
- [ ] Time a full run with [[demo-script]]: 3 min setup, 7 min presentation, 3 min Q&A; log it in [[rehearsal-log]]
- [ ] Rehearse the design segment in [[design-talking-points]] out loud and time it
- [ ] Skim [[qa-cheatsheet]] and [[known-limits]] out loud; rehearse Q&A (why this architecture, how data is secured, what is innovative)
- [ ] Slides follow the rating sheet: planning, architecture (MVVM diagram), UX and accessibility, live demo
- [ ] Links and QR codes can be shown but judges can't scan or click them
- [ ] Bring photo ID matching the name badge, and FBLA dress code attire

## Evidence gaps (points on the rating sheet)
- [ ] Run the three sessions in [[usability-test-plan]] and write [[usability-results]]
- [ ] Gaps from `planning/self-assessment.md`: evidence of pre-build planning, short usability sessions with real users

## Before submitting
- [ ] Delete the `tester@example.com` user in Supabase (Authentication → Users) and remove the DEV BYPASS code (`services/DevBypass.ts` and the spots in `screens/OnboardingScreen.tsx`)
- [ ] Delete the leftover test trips on the tester account
- [ ] Keep the sourcing table in `references/index.md` in the submission; judges require credits for the font and icons
- [ ] Commit the vault edits in `docs/` when you are happy (still uncommitted in your working tree)
- [ ] Delete the extra test user `verify.bot.1026@example.com` in Supabase (Authentication → Users) and fix or delete `tester@example.com` (its user has no `profiles` row, so it can't create trips)
- [ ] Delete the empty Obsidian scratch files `docs/Untitled.base` and `docs/Untitled.canvas` (untracked)
- [ ] Optionally delete the merged local branch `sdk-58-upgrade`
