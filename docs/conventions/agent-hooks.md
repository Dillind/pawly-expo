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
does two things:

1. It checks **every** segment of the path for kebab-case, folders included. A leading `_`, a
   leading `+`, `(route-groups)` and `[brackets]` are allowed.
2. It runs ESLint on that one file with `--max-warnings=0`, which takes about three seconds.

The code rules used to be greps in this script. They moved to `eslint.config.js` in CRU-181, because
a hook binds only an agent and CI never ran it. ESLint parses the file, so a Prettier-wrapped import,
a double-quoted specifier and a type-only import are all handled without the normalised-copy trick
the script once needed. The rules, and the files each one exempts, are in `eslint.config.js`:

| Rule                                                             | Allowed in                                    |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `lucide-react-native`, `sonner-native`, `expo-haptics` imports   | their one wrapper in `src/lib` or `constants` |
| the Supabase client                                              | `src/services/**`                             |
| a `TrueSheet` value import                                       | `base-sheet.tsx`                              |
| `FlatList`, `SectionList`, `FlashList`, a `LegendList` value     | `main-legend-list.tsx`                        |
| `.from('feed_logs').insert(`, `watch()`, `forwardRef`, `console` | nowhere                                       |
| an inline `queryKey` array                                       | nowhere — use `queryKeys`                     |
| `if (error) throw error` straight after a query                  | nowhere in services — use `unwrap()`          |
| `<Controller>` around `TextInputValidated`                       | nowhere — use `FormTextInput`                 |
| a store read through a selector function                         | nowhere — destructure                         |
| a text size or radius that is a token, a raw colour              | `src/constants/**` and fixed art              |
| a comment block over three lines, JSDoc, a banner, a bare TODO   | nowhere                                       |

`scripts/guard-branch.sh` runs before a `Bash` call. It blocks the call when the command contains a
`git commit` and `HEAD` is `main`. `git log`, `git show` and every other read pass through.

## Where a new rule goes

A rule that a parser can check goes in `eslint.config.js`, never in a script: then CI enforces it,
the editor shows it, and this hook reports it on the edit. A rule that needs judgement — "is this an
alert or a toast?", "is this the third copy?" — goes in `/crumpet-code-conventions` or
`/crumpet-ui-conventions`, because no linter answers it.

## Testing a change to the boundary script

Exit 2 stops the work, so a false positive is expensive. Two things must both hold, and the second
is the one that catches mistakes:

1. **Every violation is caught.** Write the bad file, run the script on it, expect exit 2.
2. **No real file is flagged.** For a lint rule, `bun run lint` must pass on the whole tree. For
   the path check, sweep every file. The sweep also runs ESLint once per file, so expect it to take
   about 20 minutes:

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
