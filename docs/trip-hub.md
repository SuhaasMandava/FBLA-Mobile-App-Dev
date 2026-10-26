---
tags: [triphub, design, screen]
created: 2026-10-25
---
# Trip Hub

The at-a-glance home screen for the active trip (`screens/HomeScreen.tsx`, Home tab). Style rules: [[design-system]] section 12. Before/after: [[screen-changelog]]. People and accessibility: [[user-journey-and-accessibility]].

## Direction: "Boarding pass at midnight"
Midnight navy and sunset orange stay (palette from `icon-options/palettes.png`, see [[references/index|references]]). New idea: the hero is a boarding pass. Destination in big type, the Route as the trip's progress, a perforation with two notches, and a stub holding the countdown and the crew. Titles and big numbers use Bricolage Grotesque; body text stays in the system font.

## Order of sections (top to bottom)
1. `TripTicket`: destination, dates, Route progress, countdown ("46 days to go", "Day 3 of 5", "Done"), crew avatars.
2. Invite Friends (first only while you are the sole member): six code tiles, Share, WhatsApp, Text.
3. `GlanceTile`s: Next stop (wide), Budget (meter, turns rose with words when over), Checklist (meter). Each opens its tab.
4. Announcements, Coming Up (the stops after the next one), Invite (when not alone), Share the Trip (X), Crew, Trip Settings.

## States
- Loading: `SkeletonList` ("Loading your trips"). Empty: `EmptyState` with Create Trip / Join with Code. Error: `EmptyState` tone error plus Try Again; inline `InlineBanner` for refresh errors and share errors. Offline: `OfflineBanner`.
- Next stop with nothing planned asks for the first stop; Checklist with no items says "No items / Nothing on the list yet".

## Motion
`Reveal` slides each section up and fades it in, staggered 70 ms (`motion.stagger`), and the ticket's Route fills in left to right. Press feedback on tiles: opacity and a 2% shrink. All of it stops when Reduce Motion is on (`hooks/useReducedMotion.ts`).

## Behavior kept
Share flows (`ShareService`: share sheet, WhatsApp, Messages, X; no invite code in X posts), join codes, live sync and pull-to-refresh are unchanged; only their look changed.
