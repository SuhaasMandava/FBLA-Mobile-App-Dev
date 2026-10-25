@AGENTS.md

## Contributor policy

Never add Co-Authored-By: Claude or any Claude/Claude Code attribution to git commit messages or pull requests.

## Project notes (Obsidian vault in docs/)

Before starting a task, read `docs/index.md`, then only the notes relevant to the task. Don't read `docs/design-system.md` or `README.md` in full; search them.

This project uses React Navigation with root-level folders (`screens/`, `components/`, `context/`, `hooks/`, `models/`, `services/`, `utils/`). There is no `src/app/` and no Expo Router, so ignore the Expo Router section of `AGENTS.md`.

### Keep the notes alive (do this without being asked)
Update the notes in the same session the change happens, not later:
- **Started or finished something** → `docs/current-work.md`.
- **Made a design choice** → one entry in `docs/decisions.md` (what, why).
- **Fixed a bug, hit a surprise, or learned something non-obvious** (a library quirk, a failed approach, a command that needs a flag) → one or two lines in `docs/gotchas.md`, so it never gets debugged twice.
- **Added, moved or removed a folder, service, screen or table** → `docs/architecture.md`.
- **A new rule or command** → `docs/conventions.md`.
- **A new reference image, PDF or source appears in `docs/references/`** (or the user shares one) → add an entry to `docs/references/index.md`: what it is, why it matters, and exact values (colors, sizes, text). Look at the file once, write the description, and from then on read the description instead of the file.

### Keep the notes small (this is what saves usage)
- Each note stays under about 60 lines. When one grows past that, condense it: merge duplicates, delete anything finished or obsolete.
- Write facts and pointers (file paths), never pasted code.
- Don't record what the code already says clearly. Record why, and what's not obvious.
- If a note and the code disagree, trust the code and fix the note.
- When the user says "wrap up", run the `/wrap-up` steps in `.claude/commands/wrap-up.md`.
