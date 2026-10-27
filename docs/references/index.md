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
Folder `docs/screenshots/`; required names `home.png`, `itinerary.png`, `budget.png`, `checklist.png` (details in its README). When the user provides them, describe each here (what screen, which demo data).

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
