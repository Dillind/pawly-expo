#!/usr/bin/env bash
# Stop hook. Runs the gate when Claude finishes a turn, so work that fails
# typecheck, lint, format, spelling or tests is never handed over as done.
#
# Exit 2 returns the failure to Claude and stops it finishing. Exit 0 lets it
# stop. Most turns cost nothing, because the guards below skip a turn that
# changed no code.

set -uo pipefail

input=$(cat)

# A Stop hook that blocks gets called again on the next stop. Without this the
# pair loops for ever when the gate cannot be made green.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = 'true' ]; then
  exit 0
fi

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# Nothing changed, or nothing that the gate can fail on. A docs-only turn is
# still checked by format and spelling, which cost under two seconds.
changed=$(git status --porcelain | awk '{print $NF}')
[ -n "$changed" ] || exit 0

if ! printf '%s\n' "$changed" | grep -qE '\.(ts|tsx|js|jsx|json|sql)$'; then
  if ! out=$(bun run format:check 2>&1 && bun run spellcheck 2>&1); then
    printf 'The gate failed. Fix it before you finish.\n\n%s\n' "$out" >&2
    exit 2
  fi
  exit 0
fi

if ! out=$(bun run check 2>&1); then
  {
    echo "bun run check failed, so this work is not finished."
    echo
    printf '%s\n' "$out" | tail -40
    echo
    echo "Fix the failure and run 'bun run check' again. 'bun run format' fixes a"
    echo "formatting failure on its own."
  } >&2
  exit 2
fi

exit 0
