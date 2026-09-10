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

| Rule                              | Where it is allowed                                        |
| --------------------------------- | ---------------------------------------------------------- |
| `from 'lucide-react-native'`      | `src/constants/icon-map.ts` only                           |
| `from '@/lib/supabase/client'`    | `src/services/**` and the client itself                    |
| a `TrueSheet` value import        | `src/components/bottom-sheets/base-sheet.tsx` only         |
| `toast` from `sonner-native`      | `src/lib/toast.ts` only                                    |
| `.from('feed_logs').insert(`      | nowhere — a feed log is written through the `log_feed` RPC |
| `= watch(`                        | nowhere — use `useWatch({ control, name })`                |
| a filename that is not kebab-case | leading `_`, leading `+`, and `[brackets]` are allowed     |

`scripts/guard-branch.sh` runs before a `Bash` call. It blocks the call when the command contains a
`git commit` and `HEAD` is `main`. `git log`, `git show` and every other read pass through.

## Why these seven and not others

Each one survives `bun run check`. Typecheck sees a valid import. ESLint has no opinion on which
file may import `lucide-react-native`. The code compiles, the tests pass, and the rule is broken
anyway — which is the exact failure mode `KNOWLEDGE.md` exists to record.

A rule that a lint config already enforces does not belong here. Neither does a rule that needs
judgement: "is this an alert or a toast?" has no grep that answers it.

## When a hook is wrong

Exit 2 stops the work, so a false positive is expensive. If a check fires on legitimate code, fix
the script rather than work around it, and add the case to the table above.
