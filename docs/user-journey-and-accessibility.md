---
tags: [triphub, ux, accessibility]
created: 2026-10-25
---
# User journey and accessibility

Journey map and rationale: `design-system.md` sections 2 and 9. This note records what the Trip Hub redesign changed for them. Related: [[trip-hub]], [[usability-test-plan]].

## Journey on the Trip Hub
- **Just created a trip:** ticket, then Invite Friends straight below (you are alone), so the first action is obvious.
- **Group joined:** the glance tiles answer "what's next, what have we spent, what's left to pack" without opening three tabs.
- **On the trip:** the stub says "Day 3 of 5"; Next stop tile is the first thing under the ticket.
- **After:** the stub says "Done"; Budget opens settle-up and the Trip Summary.

## Accessibility checklist (checked in code; device screen-reader pass still open, see [[human-todo]])
- **Contrast (WCAG AA):** `npm run check:contrast` covers the new `heroPanel` pairs (min 7.25:1 text, 4.75:1 graphics). Orange `accent` text is only used where the check passes.
- **Touch targets:** tiles, rows and buttons are at least 44 pt (`layout.minTarget`); tiles are far larger.
- **Scalable text:** all text scales; ticket stub, tiles and invite row wrap or stack at `layout.largeTextScale`; the code tiles cap growth at 1.3x so six still fit.
- **Screen readers:** the ticket reads as one sentence; tiles read "Budget, $42.50, of $1,500" with a hint ("Opens the budget and settle-up"); the invite code reads letter by letter; all graphics (Route, notches, meters, avatars) are hidden from readers.
- **Color is never the only signal:** over budget uses a rose tile edge, an alert icon and the words "over your budget".
- **Motion:** every animation checks Reduce Motion; nothing loops.
- **Fonts:** Bricolage Grotesque only on titles and numerals; body stays in the platform font for legibility.
