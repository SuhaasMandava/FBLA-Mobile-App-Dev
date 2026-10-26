---
tags: [triphub, presentation, design]
created: 2026-10-25
---
# Design talking points and judge Q&A

7-minute design segment (fits inside [[demo-script]]). Rating items from [[fbla-mad-2026-27]]. Details: [[trip-hub]], [[user-journey-and-accessibility]], [[decisions]].

## Talking points (about 7 min)
1. **0:00 The problem (30 s).** Group trips are scattered across chats, spreadsheets, payment apps. One home screen should answer "what's next, what's spent, what's left".
2. **0:30 The idea (45 s).** Trip Hub as a boarding pass: destination, Route progress, countdown. Midnight navy + sunset orange from our own icon, so the app and icon match.
3. **1:15 Live walkthrough (2 min).** Ticket → Invite code tiles → share to WhatsApp → glance tiles → open Budget from the tile. Show a second phone updating live.
4. **3:15 Accessibility (1 min 30 s).** Contrast script, 44 pt targets, large text restack, screen-reader sentence on the ticket, Reduce Motion, color never the only signal.
5. **4:45 Code quality (1 min).** Tokens and shared components (`TripTicket`, `GlanceTile`, `Reveal`), MVVM, 247 tests, validation in app and database.
6. **5:45 Social sharing (45 s).** Share sheet, WhatsApp, Messages, X; X posts never carry the invite code.
7. **6:30 Close (30 s).** What we'd test next with real users ([[usability-test-plan]]).

## Likely Q&A mapped to the rating sheet
| Rating item | Question | Answer |
| --- | --- | --- |
| Design and code quality | Why this look? | Boarding pass fits a trip; palette comes from our icon; one display font for titles, system font for reading. |
| Design and code quality | Third-party assets? | Bricolage Grotesque (SIL OFL), Ionicons (MIT); logged in [[references/index|references]]. |
| Design and code quality | How is the code organized? | MVVM; screens only draw; shared components; tokens in `theme/theme.ts`. |
| User experience | Who is it for and how did you design for them? | Non-technical groups; plain words; invite first when alone; empty/loading/error states. |
| User experience | Accessibility? | See checklist in [[user-journey-and-accessibility]]; honest gap: no real screen-reader test yet. |
| Application functionality | Does it cover the prompt? | Itinerary, budget and settle-up, checklist, announcements, invites, sharing; see `planning/requirements-map.md`. |
| Social media | Which app, and does it work directly? | WhatsApp and X open with a prepared message; Messages and the share sheet too. |
| Any | What would you change? | Per-screen restyle of the other tabs, real-user tests. |
