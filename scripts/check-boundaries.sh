#!/usr/bin/env bash
# PostToolUse hook: checks the one file just written under src/ and exits 2 with the reason,
# so the fix happens on the edit that caused it. ESLint holds the code rules; this adds paths.

set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
rel=${file#"$root"/}

case "$rel" in
  src/*) ;;
  *) exit 0 ;;
esac

violations=()
add() { violations+=("$1"); }

# --- Path naming -------------------------------------------------------------
# Every segment under src/, folders included — AGENTS.md says "files and folders
# are kebab-case", and a basename-only check misses src/components/Bad/thing.tsx.
#
# Allowed, all Expo Router shapes: a leading _ (_layout) or + (+not-found), a
# (route-group) in parentheses, a [dynamicSegment] whose inside is camelCase by
# Expo Router convention, and dotted suffixes (…-validated.ios.tsx). Anything
# else — an uppercase letter, an underscore inside the name, a space,
# punctuation — fails.
#
# The route-group form is here because a sweep over src/ without it flagged 54
# of 360 real files. Re-run that sweep after any change to this pattern.
segment_ok='^[_+]?(\([a-z0-9]+(-[a-z0-9]+)*\)|\[[A-Za-z0-9]+\]|[a-z0-9]+(-[a-z0-9]+)*)(\.[a-z0-9]+)*$'
IFS='/' read -ra parts <<<"${rel#src/}"
for part in "${parts[@]}"; do
  [ -n "$part" ] || continue
  if ! printf '%s' "$part" | grep -qE "$segment_ok"; then
    add "Path segment '$part' in '$rel' is not kebab-case. AGENTS.md > Naming & imports: files and folders are kebab-case."
  fi
done

# --- Lint -------------------------------------------------------------------
# Every code rule lives in eslint.config.js, so CI enforces it too. Running it here
# reports a violation on the edit that made it, not at the end of the turn.
if ! lint=$(bunx eslint --no-warn-ignored --max-warnings=0 "$rel" 2>&1); then
  add "ESLint:
$lint"
fi

if [ ${#violations[@]} -eq 0 ]; then
  exit 0
fi

{
  echo "Boundary check failed for $rel:"
  for v in "${violations[@]}"; do echo "  - $v"; done
  echo "Fix this before you continue."
} >&2
exit 2
