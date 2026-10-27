---
tags: [triphub, presentation]
created: 2026-10-25
---
# Demo script (7 minutes)

Timed run for the live demo. The technical-reference → Demo steps is the source; this adds the new payment beat and cut rules. Related: [[qa-cheatsheet]], [[backup-plan]], [[human-todo]] (section E), [[current-work]].

Setup (3 min allowed before): two phones, A = organizer, B = member, demo trip loaded, notifications on, phones charged. No QR codes or links for judges to open.

| Time | Beat | Show | Say |
| --- | --- | --- | --- |
| 0:00 | Why | Home | Group trips live across chats, spreadsheets and payment apps. TripHub is one place. |
| 0:30 | Join | A: Invite Friends; B: Join with Code | Code filled in from the link; the invite never leaks in public posts. |
| 1:30 | Plan | A adds activity; B sees it live; B comments | Live sync, reminder 30 min before. |
| 3:00 | Money | B logs a split-by-shares expense; A gets alert | Integer cents, validation ($0 / blank name refused). |
| 4:00 | Settle up | Budget → tap a payment → Mark as paid; balances shrink; open Trip Summary | New: balances reach zero; recap of spend, who paid what. |
| 5:00 | Organize | Paste a packing list; tick on B, shows on A | "Done by <name>". |
| 5:45 | Manage | Trip Settings: Make Organizer, last organizer can't leave | Rules enforced in the database. |
| 6:15 | Reliability | Airplane mode on A; dark mode; large text | Reads offline, edits refused politely. |
| 6:45 | Under the hood | MVVM diagram slide | RLS, 243 unit tests, `npm run test:db`. |

## If running long (cut in this order)
1. Manage (0:30). 2. Reliability dark mode / large text. 3. Trim Join to one sentence.

## Rehearsal log
Record each timed run in [[rehearsal-log]] (create it when the first run happens).
