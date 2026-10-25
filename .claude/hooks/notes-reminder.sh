#!/usr/bin/env bash
# Stop hook: if code changed after the docs/ notes were last touched, ask Claude
# to update the notes (docs/wrap-up.md) before finishing. Once per turn.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# Already continuing because of this hook: don't loop.
grep -q '"stop_hook_active" *: *true' && exit 0

newest_code=0
while IFS= read -r f; do
  [ -e "$f" ] || continue
  t=$(stat -c %Y "$f" 2>/dev/null) || continue
  [ "$t" -gt "$newest_code" ] && newest_code=$t
done < <(git status --porcelain -uall | cut -c4- | grep -vE '^(docs/|\.claude/|\.mcp\.json$|CLAUDE\.md$)')

[ "$newest_code" -eq 0 ] && exit 0

newest_docs=0
while IFS= read -r f; do
  t=$(stat -c %Y "$f" 2>/dev/null) || continue
  [ "$t" -gt "$newest_docs" ] && newest_docs=$t
done < <(find docs -maxdepth 2 -name '*.md' 2>/dev/null)

[ "$newest_code" -le "$newest_docs" ] && exit 0

echo '{"decision":"block","reason":"Code changed since the docs/ notes were last updated. Update the notes per docs/wrap-up.md (current-work, plus decisions/gotchas/architecture/conventions only if they apply). Keep it brief; if nothing is worth recording, say so and stop."}'
