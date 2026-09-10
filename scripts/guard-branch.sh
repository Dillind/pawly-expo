#!/usr/bin/env bash
# PreToolUse hook on Bash. Blocks a commit made straight onto main.
#
# AGENTS.md > Branches: every feature or non-trivial change gets a branch, named
# before work starts. A prose rule does not stop a commit, so this does.
# Exit 2 blocks the call and returns the reason to Claude.

set -uo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

[ -n "$cmd" ] || exit 0

# Only a real commit. `git log`, `git show` and the like are untouched.
printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+([^;&|]*[[:space:]])?commit([[:space:]]|$)' || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
[ "$branch" = 'main' ] || exit 0

cat >&2 <<'MSG'
Blocked: this commit lands on main.

AGENTS.md > Branches requires a branch, named before the work starts:
  <type>/CRU-<nnn>-<kebab-case-slug>

Take the next id from `git fetch --all --prune`, the highest existing PAW-nnn or
CRU-nnn across branches AND open issues, then add one. Create the branch and
commit again.
MSG
exit 2
