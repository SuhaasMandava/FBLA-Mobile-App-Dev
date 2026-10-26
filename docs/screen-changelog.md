---
tags: [triphub, design, changelog]
created: 2026-10-25
---
# Screen changelog

One entry per screen: before, after, files, git checkpoint (roll back with `git revert <hash>`). Design notes: [[trip-hub]], [[design-system]].

## Trip Hub (Home) — `c7fec1c`
- **Before:** flat navy card with location, a Route line and a members row; plain invite code in monospace; Budget as a single list row; no checklist at a glance.
- **After:** boarding-pass `TripTicket` (destination in display type, Route, perforation, countdown stub); six-tile `InviteCode` in a dashed "pass" card; `GlanceTile`s for Next stop, Budget and Checklist with meters; staggered `Reveal` entrance. Coming Up now lists the stops after the next one.
- **Files:** `screens/HomeScreen.tsx`, `components/TripTicket.tsx`, `GlanceTile.tsx`, `InviteCode.tsx`, `Reveal.tsx`, `BudgetMeter.tsx` (tones), `utils/tripProgress.ts` (`tripCountdown`) + test, `theme/theme.ts`, `App.tsx` (font gate), `screens/RootNavigator.tsx` (header font).

## Whole app (inherits) — `c7fec1c`, `fdc8072`
- Titles (`largeTitle` to `title3`, nav headers, section headers, empty-state titles) now use Bricolage Grotesque. New roles `display` and `stat`.
- Grouped lists get a hairline edge (`ListSection`) so cards stay defined in light mode; empty states fade in.
- Not individually restyled: Itinerary, Budget, Checklist, Settings, forms. They pick up fonts, list edges and tokens; a per-screen pass is the next step ([[current-work]]).

## Itinerary, Budget, Checklist, Settings (Oct 25, one commit each)
- **Itinerary** (`92030a7`): stop cards get a hairline edge (accent edge for today's stops), times become tint pills, empty days show a dashed "slot" instead of a bare line. `screens/ItineraryScreen.tsx`.
- **Budget** (`15e5a50`): headline card is now `HeroStat` (new `components/HeroStat.tsx`): big spent figure, meter, and a stub with the status in words ("$1,457.50 left", "Over budget by ..."). `screens/BudgetScreen.tsx`.
- **Checklist** (`d11e653`): its progress card reuses `HeroStat` ("5/12 done", "All done. Ready to go!"). `components/ChecklistProgress.tsx`. The list rows are unchanged.
- **Settings** (this series' last commit): a navy account card (avatar, name, email) replaces the Account rows. `screens/SettingsScreen.tsx`.
- `c4d36b6` adds `.prettierrc` (single quotes, width 120) because bare Prettier reformatted whole files; always run Prettier with it.
- Checklist and Budget lists were only seen with empty or error data (migration 006 not run on the test project), so their populated rows were not viewed.

## Fixes after first phone run (Oct 26)
- `Reveal` now fills its parent's width (`alignSelf: stretch`): on iPhone the empty-state text and buttons ran off both screen edges because the animation wrapper shrank to its content (`components/Reveal.tsx`, commit "Fix empty states overflowing...").
- Web check of Trip Hub, Itinerary, Budget, Checklist, Trip Summary with real data (single user) found no layout problems; see [[human-todo]] section 0.
