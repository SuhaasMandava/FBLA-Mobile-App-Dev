---
tags: [triphub, todo, manual]
created: 2026-10-25
---
# Human to-do

Things Claude Code can't do for us. Tick them off here in Obsidian. Context: [[current-work]], [[index]]. Test steps assume two phones signed in as different members of one trip (one organizer, one plain member).

## A. Database (Supabase SQL editor)
- [ ] Run `supabase/migrations/006_checklist.sql` (safe to re-run), then restart the app
- [ ] Run the Budget/expenses migration if not already done
- [ ] Run every migration numbered after 006 (added with the Oct 22 group features), in order. Check `supabase/migrations/`
- [ ] Confirm "Confirm email" is OFF in Supabase Auth settings (sign-up breaks otherwise)
- [ ] Use the app the day before the event (free Supabase projects pause after about a week idle)

- [ ] Run `supabase/migrations/010_settlements.sql` then `011_audit_fixes.sql` (011 changes who can record a payment and fixes two edge cases)
- [ ] Before submitting: delete the `tester@example.com` user in Supabase (Authentication → Users) and remove the DEV BYPASS code
- [ ] Delete the leftover "QA Trip" on the tester account

## B. Two-phone test: Checklist
- [ ] Phone A adds an item; B pulls to refresh and sees it; it shows on A's list too
- [ ] B ticks it; A shows "Done by <B's name>". Untick and the "Done by" line goes away
- [ ] Both phones tick the same item at once; end state is consistent, no errors
- [ ] Assign an item to the other person; each phone reads "Assigned to you" or the name correctly
- [ ] Delete as a member who didn't add the item: button is absent. Organizer can delete it
- [ ] A deletes an item while B has its edit sheet open; B gets an error or "This item is gone" on save
- [ ] Remove the assigned member from the trip; item shows "a former member" and can still be ticked
- [ ] Airplane mode on one phone, tick an item: offline message appears and the tick is reverted
- [ ] Light and dark mode; VoiceOver/TalkBack reads the checkbox as checked/unchecked

## C. Two-phone test: Budget
- [ ] Add an expense on A; B sees it
- [ ] Even and custom splits sum exactly to the total (try $10.01 among 3)
- [ ] Only the payer or organizer can edit/delete an expense
- [ ] Settle-up "who owes whom" matches hand math
- [ ] Over-budget state shows correctly
- [ ] Airplane mode: list readable, writes refused with a friendly message

- [ ] Run `supabase/migrations/010_settlements.sql` first (new, Oct 25)
- [ ] Mark a suggested payment as paid on A; B sees the balances change live; "Payments Made" lists it; undo restores it
- [ ] A member not in the payment (and not an organizer) can't mark or undo it
- [ ] Budget → Trip Summary shows totals, who paid what, and "Everyone's settled up" once all are paid

## D. Two-phone test: Oct 22 group features
- [ ] Announcements: organizer posts, member sees it; member can't post
- [ ] Comments on an itinerary activity appear on the other phone
- [ ] Share to 2+ platforms works; "app not installed" fails gracefully
- [ ] `triphub://join/CODE` link opens the join flow with the code prefilled
- [ ] Organizer tools: edit trip, delete trip, leave trip, remove member (confirm prompts, RLS blocks plain members)
- [ ] Live sync: a change on A shows on B without pull-to-refresh; falls back to refresh when offline
- [ ] Reminders fire, and the setting to turn them off works
- [ ] Checklist quick-add and the first-run intro behave

## E. Demo safety net
- [ ] Run `eas init` / first preview build (adds the project id, Android package and iOS bundle id to `app.json`)
- [ ] Set Supabase env vars as EAS environment variables (the app crashes at startup without them)
- [ ] Install the standalone build on both phones and sign in ahead of time
- [ ] Load the demo seed trip (activities, expenses, checklist items)
- [ ] Practice on a phone hotspot (venue Wi-Fi may fail)
- [ ] Record a backup demo video; keep it on the laptop and a phone
- [ ] Time the full run: 3 min setup, 7 min presentation, 3 min Q&A

## F. Decisions to confirm
- [ ] Checklist delete rule: only the adder or an organizer (matches itinerary). Keep, or let any member delete?

- [ ] Skills from the TikTok list: install any yourself at user level after reading their hooks (see [[candidate-skills]]); I recommend only ponytail's review commands, and none in the submitted repo

## G. Presentation and paperwork
- [ ] Gaps from `planning/self-assessment.md`: evidence of pre-build planning, short usability sessions with real users
- [ ] Slides follow the rating sheet: planning, architecture (MVVM diagram), UX and accessibility, live demo
- [ ] Rehearse Q&A (why this architecture, how data is secured, what is innovative)
- [ ] Links and QR codes can be shown but judges can't scan or click them
- [ ] Bring photo ID matching the name badge, and FBLA dress code attire

- [ ] Run the three sessions in [[usability-test-plan]] and write [[usability-results]]
- [ ] Time a full run with [[demo-script]]; log it in [[rehearsal-log]]; skim [[qa-cheatsheet]] and [[known-limits]] out loud
- [ ] Record the backup video from [[backup-plan]]
