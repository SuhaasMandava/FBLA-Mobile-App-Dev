---
tags: [triphub, tooling, skills]
created: 2026-10-25
---
# Candidate Claude Code skills (reviewed, NOT installed)

Source: a TikTok slideshow by tradeJason ("5 repos I add to every Claude Code project"), three slides seen: items 1, 2 and 4. URLs were read off screenshots, so confirm the owner names on GitHub before installing. Review done from each repo's README only; hooks and scripts were not inspected. Related: [[decisions]], [[human-todo]], [[conventions]], [[self-assessment]] (item 4: vendored skill content).

| Repo | What it does | Fit for TripHub |
| --- | --- | --- |
| `dietrichgebert/ponytail` (MIT, ~157k stars claimed) | Steers the agent to write less code and avoid duplication; adds `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`; a usage "band" stored in `~/.config/ponytail/`. | Useful for code review before the event. Has hooks and scripts; unchecked network use. |
| `ayghri/i-have-adhd` (MIT, ~55k stars claimed) | Output style: answer first, numbered steps, no filler. | Overlaps with what this project's notes already ask for. Low value. Install prompt makes the agent fetch and follow remote AGENTS.md. |
| `nextlevelbuilder/ui-ux-pro-max-skill` (MIT, ~54k to 140k claimed) | Design data (styles, palettes, fonts, UX rules) plus a stdlib Python search script; installs via marketplace or `uipro` npm CLI. | Overlaps `docs/design-system.md` and the apple-design skill; risk of restyling a finished, contrast-checked design. |

Star counts differ between slides and the README, so treat them as unverified. Items 3 and 5 of the video were not seen.

## Why nothing was installed
- Plugins run hooks and scripts with the agent's permissions; these came from a social-media list, not a source we vetted.
- The self-assessment already lists "remove vendored skill content from the submitted repo" (copyright and documentation score). Adding more vendored skills makes that worse.
- TripHub's design is finished and tested (contrast, large text), so a design skill adds risk, not value.

## If you still want one (user-run, outside the repo copy)
Prefer a user-level plugin install, not files in the repo, and inspect `hooks/` and `scripts/` first:
- ponytail: `/plugin marketplace add DietrichGebert/ponytail` then `/plugin install ponytail@ponytail`
- ui-ux-pro-max: `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`
- After installing, run `/ponytail-review` on `screens/` and `context/` and log findings in [[current-work]].

## Status
- Oct 25: ponytail was installed at user level, used once (`/ponytail-audit`), then uninstalled and its marketplace removed at the user's request. The audit findings were not saved as a note; the key ones are in [[bug-list-2026-10-25]] and [[current-work]].
