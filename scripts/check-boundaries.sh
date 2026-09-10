#!/usr/bin/env bash
# PostToolUse hook. Enforces the import boundaries and file-naming rules in
# AGENTS.md that a typecheck and a lint pass cannot see.
#
# Reads the hook JSON on stdin, checks the one file that was just written, and
# exits 2 with the reason on stderr so Claude is told to fix it straight away.
# Exit 0 means clean. Never fails the edit for a file outside src/.

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

# --- Normalised copy for import matching -------------------------------------
# An import is not reliably one line. Prettier wraps a long one across several,
# and a module specifier may be double-quoted before `bun run format` rewrites
# it. Matching the raw text line by line misses both, so build one normalised
# blob first: line comments dropped, double quotes folded to single, all
# whitespace removed. Every import then reads as import{a,b}from'mod'.
norm=$(python3 -c '
import re, sys
src = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
src = re.sub(r"^\s*//.*$", "", src, flags=re.M)   # line comments
src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)   # block comments
src = src.replace(chr(34), chr(39))               # " -> '"'"'
sys.stdout.write(re.sub(r"\s+", "", src))
' "$rel" 2>/dev/null) || norm=$(tr -d '[:space:]' <"$rel")

# --- Import boundaries -------------------------------------------------------
if printf '%s' "$norm" | grep -qF "from'lucide-react-native'" \
  && [ "$rel" != 'src/constants/icon-map.ts' ]; then
  add "Imports lucide-react-native directly. Only src/constants/icon-map.ts may. Use <Icon name=\"...\" /> instead. See ADR 0008."
fi

if printf '%s' "$norm" | grep -qF "from'@/lib/supabase/client'" \
  && [[ "$rel" != src/services/* ]] \
  && [ "$rel" != 'src/lib/supabase/client.ts' ]; then
  add "Imports the Supabase client outside src/services/. A remote call belongs in a service, and a query hook wraps it."
fi

# A type-only import is fine — the rule is about the value. `import type {...}`
# and an inline `type TrueSheet` specifier are both allowed through.
if printf '%s' "$norm" | grep -qE "import\{([^}]*,)?TrueSheet[,}]" \
  && [ "$rel" != 'src/components/bottom-sheets/base-sheet.tsx' ]; then
  add "Value-imports TrueSheet. Only base-sheet.tsx may. Build on BaseSheet and import TrueSheet as a type for the ref."
fi

if printf '%s' "$norm" | grep -qE "import\{([^}]*,)?toast(,[^}]*)?\}from'sonner-native'" \
  && [ "$rel" != 'src/lib/toast.ts' ]; then
  add "Imports toast from sonner-native. Use showSuccessToast / showErrorToast / showInfoToast from @/lib/toast."
fi

# --- Domain rules ------------------------------------------------------------
if printf '%s' "$norm" | grep -qF "from('feed_logs').insert("; then
  add "Inserts into feed_logs directly. A feed log is only created through the log_feed RPC — the Double Feed guard and the alert trigger both hang off it."
fi

if printf '%s' "$norm" | grep -qE "=watch\(" ; then
  add "Uses watch() from react-hook-form. Use useWatch({ control, name }) — React Compiler cannot memoise watch()."
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
