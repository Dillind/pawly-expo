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

base=$(basename "$rel")
violations=()

add() { violations+=("$1"); }

# --- File naming -------------------------------------------------------------
# Expo Router allows a leading _ (_layout) and a leading + (+not-found).
# Dynamic segments live in [brackets]. Nothing else may carry an uppercase
# letter or an underscore.
name_probe=${base#_}
name_probe=${name_probe#+}
name_probe=${name_probe//[/}
name_probe=${name_probe//]/}
if printf '%s' "$name_probe" | grep -q '[A-Z_]'; then
  add "Filename '$base' is not kebab-case. AGENTS.md > Naming & imports: files and folders are kebab-case."
fi

# --- Import boundaries -------------------------------------------------------
if grep -q "from 'lucide-react-native'" "$rel" && [ "$rel" != 'src/constants/icon-map.ts' ]; then
  add "Imports lucide-react-native directly. Only src/constants/icon-map.ts may. Use <Icon name=\"...\" /> instead. See ADR 0008."
fi

if grep -q "from '@/lib/supabase/client'" "$rel" \
  && [[ "$rel" != src/services/* ]] \
  && [ "$rel" != 'src/lib/supabase/client.ts' ]; then
  add "Imports the Supabase client outside src/services/. A remote call belongs in a service, and a query hook wraps it."
fi

if grep -qE "^import \{[^}]*\bTrueSheet\b" "$rel" \
  && [ "$rel" != 'src/components/bottom-sheets/base-sheet.tsx' ]; then
  add "Value-imports TrueSheet. Only base-sheet.tsx may. Build on BaseSheet and import TrueSheet as a type for the ref."
fi

if grep -qE "^import \{[^}]*\btoast\b[^}]*\} from 'sonner-native'" "$rel" \
  && [ "$rel" != 'src/lib/toast.ts' ]; then
  add "Imports toast from sonner-native. Use showSuccessToast / showErrorToast / showInfoToast from @/lib/toast."
fi

# --- Domain rules ------------------------------------------------------------
if tr -d '[:space:]' <"$rel" | grep -qE "from\('feed_logs'\)\.insert\("; then
  add "Inserts into feed_logs directly. A feed log is only created through the log_feed RPC — the Double Feed guard and the alert trigger both hang off it."
fi

if grep -qE "=[[:space:]]*watch\(" "$rel"; then
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
