---
tags: [triphub, todo, manual]
created: 2026-10-25
updated: 2026-10-26
---
# Human to-do (build stage)

Only what is needed to finish building and testing the app, highest priority first. Presentation, demo and submission tasks are parked in [[human-todo-later]]. Context: [[current-work]], [[index]]. Phones: two iPhones running Expo Go (SDK 58). In Expo Go, reminders and `triphub://join/` links don't work; test those later in an installed build or skip them.

## 0. Already verified by Claude on web (Oct 26, one signed-in user, phone-width browser)
Sign-up with weak/mismatched password errors; Create Trip validation (empty fields, end before start); trip creation; Trip Hub ticket ("Day 1 of 4"), invite code tiles; checklist quick add and tick ("Done by you", Home tile 1/3); itinerary add with time (today's stop highlighted); $0 expense rejected; over-budget expense; Budget, Home tile and Trip Summary all show over budget; Next stop tile opens Itinerary; delete trip confirm and delete. NOT covered here: a second user (RLS, live sync, who-can-edit), sharing to apps, VoiceOver, large text, reminders, real iPhone layout. Database rules for two users pass in `npm run test:db`.

## 1. Get the app running on both iPhones (now)
- [x] Supabase migrations 006 to 011 run (Oct 26)
- [x] "Confirm email" off, "Allow anonymous sign-ins" off (Oct 26; confirm Save changes was clicked)
- [x] EAS linked (`eas init`) and Supabase env vars set for `preview` (Oct 26). Only needed for an installed build, not Expo Go
- [x] Project upgraded to Expo SDK 58 so the App Store Expo Go can open it (Oct 26)
- [x] Install Expo Go on both phones, run `npx expo start`, scan the QR code with each phone's Camera (same Wi-Fi, or a phone hotspot). Report any error text
- [x] Create two accounts (one per phone) and make one the organizer; join the other with the invite code
- [ ] Load the seed trip for realistic test data: create `demo.organizer@example.com` and `demo.member@example.com` in the app, then run `supabase/seed/demo_trip.sql` in the Supabase SQL editor (technical-reference → Demo mode)

## 2. Two-phone test: Budget and Checklist (money and shared list)
Budget
- [ ] Add an expense on A; B sees it (single-user add works on web, Oct 26)
- [ ] Even and custom splits sum exactly to the total (try $10.01 among 3)
- [ ] Only the payer or organizer can edit/delete an expense
- [ ] Settle-up "who owes whom" matches hand math
- [ ] Mark a suggested payment as paid on A; B sees the balances change live; "Payments Made" lists it; undo restores it
- [ ] A member not in the payment (and not an organizer) can't mark or undo it
- [ ] Budget → Trip Summary shows totals, who paid what, and "Everyone's settled up" once all are paid
- [x] Over-budget state shows correctly (verified on web Oct 26: Budget card, Home tile and Trip Summary all say over, with icon)
- [ ] Airplane mode: list readable, writes refused with a friendly message

Checklist
- [ ] Phone A adds an item; B pulls to refresh and sees it (quick add and tick verified single-user on web Oct 26)
- [ ] B ticks it; A shows "Done by <B's name>". Untick and the "Done by" line goes away
- [ ] Both phones tick the same item at once; end state is consistent, no errors
- [ ] Assign an item to the other person; each phone reads "Assigned to you" or the name correctly
- [ ] Delete as a member who didn't add the item: button is absent. Organizer can delete it
- [ ] A deletes an item while B has its edit sheet open; B gets an error or "This item is gone" on save
- [ ] Remove the assigned member from the trip; item shows "a former member" and can still be ticked
- [ ] Airplane mode on one phone, tick an item: offline message appears and the tick is reverted
- [ ] Light and dark mode

## 3. Two-phone test: group features and sharing
- [ ] Share to 2+ platforms works (WhatsApp, Text, X); "app not installed" fails gracefully
- [ ] Announcements: organizer posts, member sees it; member can't post
- [ ] Comments on an itinerary activity appear on the other phone
- [ ] Live sync: a change on A shows on B without pull-to-refresh; falls back to refresh when offline
- [ ] Organizer tools: edit trip, delete trip, leave trip, remove member (confirm prompts, RLS blocks plain members)
- [ ] Checklist quick-add and the first-run intro behave
- [ ] Not in Expo Go (needs an installed build): reminders firing, and `triphub://join/CODE` links

## 4. Look at the redesign on a real phone (see [[trip-hub]], [[screen-changelog]])
- [ ] Trip Hub: ticket and countdown show the right day; invite code tiles are readable and Share, WhatsApp, Text open the right app; the Checklist tile fills as you tick items; the Next stop tile opens the Itinerary; pull to refresh works; airplane mode shows the offline banner
- [ ] Itinerary (with activities), Budget (with an unsettled debt and an over-budget trip) and Checklist (with items): I only saw their empty or error states
- [ ] Largest phone text size: nothing is cut off, ticket stub and tiles stack. Reduce Motion on: screens appear at once with no sliding
- [ ] VoiceOver: the ticket reads as one sentence, tiles read like "Budget, $42.50, of $1,500", the invite code reads letter by letter. Write what you hear in [[user-journey-and-accessibility]]
- [ ] Decide whether to keep the Bricolage Grotesque title font; if it feels too playful, change `fonts` in `theme/theme.ts` (one place)
- [ ] Decide whether to restyle the forms (add/edit screens), Welcome, Trip Settings and Trip Summary to match the Trip Hub; they only have the new fonts so far

## 5. Decisions to confirm (lowest urgency; defaults already work)
- [ ] Checklist delete rule: only the adder or an organizer (matches itinerary). Keep, or let any member delete?
- [ ] Skills from the TikTok list: install any yourself at user level after reading their hooks (see [[candidate-skills]]); I recommend only ponytail's review commands, and none in the submitted repo

- [ ] Take 4 phone screenshots of the demo trip (home, itinerary, budget, checklist) and save them in `docs/screenshots/` with the names in its README; the root README embeds them.

- Try Delete Account (Settings, bottom) with a throwaway account, including the "hand over the trip first" refusal as sole organizer of a trip with members. Try Settings → Your Name and check the new name shows on the other phone after a refresh.
