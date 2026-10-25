# Wrap-up checklist

Run at the end of every session (say "wrap up").
Wrap up this session by updating the Obsidian notes in `docs/`. Be brief; every note stays under about 60 lines.

1. Look at what changed this session (`git status` and `git diff --stat`, plus what we discussed).
2. `docs/current-work.md`: move finished items to "Done recently", set "Now" and "Next" to what is actually true, list open problems. Drop "Done recently" entries older than about two weeks.
3. `docs/decisions.md`: add an entry for each design choice made (what, why). Skip it if none.
4. `docs/gotchas.md`: add any bug, surprise or failed approach worth not repeating. Skip it if none.
5. `docs/architecture.md` and `docs/conventions.md`: update only if structure, commands or rules changed.
6. Condense any note that has grown too long. Remove obsolete lines.
7. Reply with a 3-line summary of what you changed in the notes. Do not commit.
