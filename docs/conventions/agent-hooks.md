# Agent hooks

`.gitignore` lists `.claude`, but `.claude/settings.json` was force-added and stays tracked, so this
wiring travels with a clone and you do not need to add it yourself. It is reproduced here because a
`git add` will not pick the file up again if it ever leaves the index.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/scripts/check-boundaries.sh" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/scripts/guard-branch.sh" }]
      }
    ]
  }
}
```

Both scripts need `jq`, and both exit 0 for anything they do not cover.

## What each one checks

`scripts/check-boundaries.sh` runs after an `Edit` or a `Write`. It reads the hook JSON on stdin,
takes `tool_input.file_path`, and exits 0 immediately for a path outside `src/`. Inside `src/` it
checks:

| Rule                                  | Where it is allowed                                                     |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `from 'lucide-react-native'`          | `src/constants/icon-map.ts` only                                        |
| `from '@/lib/supabase/client'`        | `src/services/**` and the client itself                                 |
| a `TrueSheet` value import            | `src/components/bottom-sheets/base-sheet.tsx` only                      |
| `toast` from `sonner-native`          | `src/lib/toast.ts` only                                                 |
| `.from('feed_logs').insert(`          | nowhere — a feed log is written through the `log_feed` RPC              |
| `= watch(`                            | nowhere — use `useWatch({ control, name })`                             |
| a path segment that is not kebab-case | leading `_`, leading `+`, `(route-groups)` and `[brackets]` are allowed |

It checks **every** segment of the path under `src/`, folders included — a basename-only check misses
`src/components/Bad/thing.tsx`.

Imports are matched against a normalised copy of the file, not line by line. Comments are dropped,
double quotes are folded to single, and all whitespace is removed, so every import reads as
`import{a,b}from'mod'`. That is what makes a Prettier-wrapped multiline import and a double-quoted
specifier match — neither does line by line, and both are what a raw grep silently lets through.

A type-only import is deliberately allowed. `import type { TrueSheet }` and an inline
`{ type TrueSheet }` specifier are not the value, so neither is a violation.

`scripts/guard-branch.sh` runs before a `Bash` call. It blocks the call when the command contains a
`git commit` and `HEAD` is `main`. `git log`, `git show` and every other read pass through.

## Why these seven and not others

Each one survives `bun run check`. Typecheck sees a valid import. ESLint has no opinion on which
file may import `lucide-react-native`. The code compiles, the tests pass, and the rule is broken
anyway — which is the exact failure mode `KNOWLEDGE.md` exists to record.

A rule that a lint config already enforces does not belong here. Neither does a rule that needs
judgement: "is this an alert or a toast?" has no grep that answers it.

## Testing a change to the boundary script

Exit 2 stops the work, so a false positive is expensive. Two things must both hold, and the second
is the one that catches mistakes:

1. **Every violation is caught.** Write the bad file, run the script on it, expect exit 2.
2. **No real file is flagged.** Sweep the whole tree:

```bash
find src -type f \( -name '*.ts' -o -name '*.tsx' \) | while IFS= read -r f; do
  echo "{\"tool_input\":{\"file_path\":\"$PWD/$f\"}}" | ./scripts/check-boundaries.sh >/dev/null 2>&1 \
    || echo "FLAGGED: $f"
done
```

Expect no output. The first version of the path check flagged 54 of 360 real files, because Expo
Router route groups are wrapped in parentheses and the pattern did not allow them. Nothing but the
sweep would have found that before it blocked real work.

If a check fires on legitimate code, fix the script rather than work around it, and add the case to
the table above.
