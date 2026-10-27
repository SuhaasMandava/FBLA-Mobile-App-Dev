# References

Catalog of reference images, PDFs and outside docs. **Claude: read this index, not the files themselves.** Open a file only when its description isn't enough. Each entry: file → what it is, why it matters, what to take from it.

Put new files in this folder (`docs/references/`), then add an entry below. Keep descriptions to 2-3 lines and include any exact values (hex colors, sizes, names) so the image rarely needs opening.

## Images

### Icon exploration: `../icon-options/options.png`
Three early app icon concepts on a teal gradient tile: **A Pin & Crew** (white map pin with three colored dots, dotted trail), **B Converging Routes** (two arcs meeting at a node), **C Crew, Refined** (three overlapping circles). Each shown at large and small sizes to test legibility. The shipped icon is the team's "Pin & Orbit" (see `docs/planning/timeline.md`); this is exploration history.

### Palette exploration: `../icon-options/palettes.png`
The Pin icon in four palettes, with hex values:
- **Lagoon Teal (labelled "Current")**: brand `#0E7C74`, dark `#4FD1C1`, accent `#FFC857`, ink `#14201F`. Calm, coastal.
- Twilight Plum: `#6B2FA3`, `#C9A2F0`, `#FFB38A`, `#1C1424`. Social, evening plans.
- Midnight & Sunset: `#C2410C`, `#FF8A7A`, navy `#152B5C`, `#111827`. Premium, passport.
- Trailhead Green: `#1F6B45`, `#6FD39B`, `#F2B33D`, `#16201A`. Outdoors, adventure.
Source of truth for the live palette is `theme/theme.ts`, not this image.

## Documents
- [[technical-reference]]: the full developer manual (former README).

## Screenshots for the README
Folder `docs/screenshots/`; names and status in its README. All required screenshots are in and linked from the root README. Optional extras (light mode, dark/large text, comments, Trip Summary, invite) are not taken. Add a line here for each new one.
- `home.png`: iPhone, **dark mode**, Oct 26 2026 demo trip. Trip ticket "Gatlinburg, TN", Oct 26 – Oct 29, "Day 1 of 4", crew DO/DM "2 people", Next stop "Check in to the cabin" (Mon Oct 26, 4:00 PM, Laurel Ridge Cabin), Budget $838.95 of $1,500.00, Checklist 4/8.
- `home-details.png`: same trip scrolled to the middle: announcement from Demo Organizer ("Welcome to the trip! We meet at the cabin at 4 PM today..."), Coming Up (Dinner downtown 7:00 PM, Pancake breakfast, Alum Cave Trail hike).
- `home-invite.png`: scrolled to bottom: code D E M O 2 6, Share Invite Code, WhatsApp, Text, Post on X (with note that posts never include the code), Crew · 2 (Demo Organizer, Demo Member), Trip Settings row.
- `itinerary.png` (dark, 8:04 PM): header Edit + Add buttons; Day 1 · Mon, Oct 26 with a "Today" badge: Check in to the cabin 4:00 PM (Laurel Ridge Cabin), Dinner downtown 7:00 PM (Parkway, Gatlinburg), both with filled orange Route stops; Day 2 · Tue, Oct 27: Pancake breakfast 7:30 AM, Alum Cave Trail hike 8:30 AM (2 comments); Day 3 starts with Whitewater rafting 10:00 AM (1 comment).
- `itinerary-later.png`: scrolled to Days 2 to 4: adds Lunch by the river 1:30 PM (Pigeon River) and Day 4 · Thu, Oct 29 Check out 11:00 AM. Title "Itinerary" in the nav bar. Comment bubbles: outline = none, filled with number = count. Future stops use grey hollow dots.
- `budget.png` (dark, 8:05 PM, signed in as Demo Member): "Spent so far" card $838.95 of $1,500.00 with orange meter, "$661.05 left"; Settle Up: "You pay Demo Organizer $332.92" with the note "One payment squares everyone up. That's the fewest possible."; Wrap Up → Trip Summary row; start of Expenses · 4.
- `budget-expenses.png`: scrolled: Settle Up, Wrap Up, Expenses · 4: Gas for the drive $62.40 (Transport, Demo Organizer), Groceries $86.55 (Food, paid by You), Rafting tickets $210.00 (Activities), Cabin, 3 nights $480.00 (Lodging); all "split 2 ways"; footer "Only whoever paid, or the trip organizer, can edit or delete an expense." Seed dates look odd (expenses dated Oct 17 to 26).
- `checklist.png` (dark, 8:05 PM, signed in as Demo Member): "Trip checklist 4/8 done" card with meter; Packing / To-do / Booking chips (Packing selected), "Quick add" field "e.g. Sunscreen", hint "Press return after each item. Paste a list to add one item per line.", disabled "Add to Packing" button; start of Packing · 2 of 4.
- `checklist-items.png`: Packing · 2 of 4 (Rain jackets Unassigned, Headlamps Assigned to you, Hiking boots Done by Demo Organizer, Sunscreen Done by you); To-Do · 1 of 2 (Pick up snacks for the hike, Download offline maps done); Bookings · 1 of 2 (Dinner table for Saturday, Rafting reservation done). Shows assignee and "Done by" lines.
- `settings.png` (dark, 8:06 PM, Demo Member): profile card "Demo Member demo.member@example.com"; Account → Your Name; Current Trip → Smoky Mountains Weekend ("Details, members, leave or delete"); Reminders: Activity reminders and New expense alerts switches (both look off/disabled in Expo Go) with the note "Reminders work in the installed app (a development or preview build), not in Expo Go or a web browser."
- `settings-dark.png`: lower part: Appearance (Device Setting selected, Light, Dark; "Device Setting follows your phone's light or dark mode."), About (How TripHub Works; TripHub Version 1.0.0; "Made for the FBLA Mobile Application Development event."), Sign Out, Delete Account with its warning text.
- `settings-light.png`: same view in **light mode** with Appearance = Light checked. Light palette: cool grey-white background, white cards, burnt-orange accents, dark red for Sign Out/Delete. This is the light-mode proof for the README.
- Retaken Oct 26 (8:03-8:04 PM) with the Expo dev-menu gear hidden; the three overlap a little, which is fine. Still dark mode.

## FBLA competition materials
Folder for the official files: `docs/references/fbla/` (create it and drop them in). Suggested files: the event guidelines PDF, the rating sheet, the 2026-2027 topic/prompt, and any judge or coordinator emails. When one is added, catalog it here with its key numbers (time limits, point values per rating item, required deliverables) so Claude doesn't re-read the PDF.
- Event page (public, general description only): https://www.fbla.org/competitive-events/mobile-application-development/
- **Topic:** "Together We Go: Group Trip Planner", 2026-2027.
- Our summary of the prompt and rating sheet, with where each item is met in the app: `docs/planning/requirements-map.md`. Self-scoring: `docs/planning/self-assessment.md`.
- **Official guidelines and rating sheet (Aug 2026): summarized in [[fbla-mad-2026-27]]**. Read that note, not the PDF. Keep the PDF itself in `docs/references/fbla/` locally, but don't commit it to a public repo (FBLA copyright).

## App artwork
Shipped icon and splash files live in `assets/` (`icon.png`, `splash-icon.png`, `android-icon-*.png`, `favicon.png`, and the source `TripHub Icon.jpg`). `scripts/make-icons.py` exists for icon generation (unverified which of these files it produces).

## Links and sources
- FBLA event page and rating sheet: https://www.fbla.org/competitive-events/mobile-application-development/ (summarized in `docs/planning/requirements-map.md`)

- **Candidate skills screenshots** (3 TikTok slides, pasted in chat Oct 25, not saved in `references/`): GitHub pages for ponytail, i-have-adhd and ui-ux-pro-max-skill. Facts and review in [[candidate-skills]].

## Third-party assets used in the redesign (sourcing for judges)
| Asset | Source | License | Where used |
| --- | --- | --- | --- |
| Bricolage Grotesque (typeface) | https://fonts.google.com/specimen/Bricolage+Grotesque, by Mathieu Triay (github.com/ateliertriay/bricolage) | SIL Open Font License 1.1 (free for commercial use) | Titles and numerals via `theme/theme.ts` `fonts` |
| `@expo-google-fonts/bricolage-grotesque` 0.4.1 (font packaging) | https://github.com/expo/google-fonts, npm package | MIT (packaging) and OFL-1.1 (font files) | Loaded in `App.tsx` |
| Ionicons via `@expo/vector-icons` | https://ionic.io/ionicons | MIT | All icons (already in use before the redesign) |
| App icon, Route, AppMark | Original work by the TripHub team | `LICENSE` | Icon, splash, empty states |
No photographs or stock images are used.
