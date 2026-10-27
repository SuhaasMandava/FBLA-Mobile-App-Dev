---
tags: [triphub, readme, submission]
created: 2026-10-26
---
# README guide

How the root `README.md` is built and kept honest. The README is the first thing FBLA judges open, so it is a plain-language pitch; the developer manual is [[technical-reference]]. Why: [[decisions]] (Oct 26).

## Audience and tone
- Judges and non-coders. No jargon in the main text; technical terms only in the "Built and tested" table, and each has a plain meaning next to it.
- Lead with the problem, then the solution, then proof (topic mapping, accessibility, tests).

## Structure (top to bottom)
1. Logo (`assets/icon.png`), title, one-line pitch, event and topic.
2. The problem, our solution.
3. Screenshots: Trip Hub, Itinerary, Budget, Checklist, Settings (light and dark). Files and catalog: [[app-screens]], `docs/screenshots/README.md`.
4. What you can do with it (feature table), How it answers the FBLA topic (mirrors [[fbla-mad-2026-27]] and `planning/requirements-map.md`).
5. Designed for everyone (accessibility), Built and tested with care.
6. Try it (3 steps), Where to read more, Credits.

## Claims that must stay true (re-check before submitting)
- "249 unit tests": run `npm test` and update the number (also in [[qa-cheatsheet]] if repeated).
- Feature list and topic table: match the app; update when a feature is added or cut ([[known-limits]]).
- "Reminders need an installed build": true while the demo runs in Expo Go.
- Credits: SDK 58, RN 0.88, React 19.3 and the Bricolage Grotesque font are in `technical-reference.md`; keep both in sync with `package.json`.
- Light/dark claim is backed by `settings-light.png`.

## Rules
- Update the README when something user-visible changes; update the manual for developer detail.
- Links into the manual use `docs/technical-reference.md#anchor`; check them after editing headings.
- Images use fixed names; add new ones to `docs/screenshots/` and describe them in [[references/index|references]].
- Commit README work by explicit paths (see [[gotchas]]).
