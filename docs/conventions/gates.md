# Gates

`bun run check` is the gate — typecheck, lint, `format:check`, spellcheck and test, in that order,
stopping at the first failure. It takes about 13 seconds on this repo.

Four things run it. They bind different people, which is why there are four and not one.

| Layer                   | Binds                                 | When                                | Cost   |
| ----------------------- | ------------------------------------- | ----------------------------------- | ------ |
| Claude `Stop` hook      | an agent in Claude Code               | end of every turn that touched code | ~14s   |
| `pre-commit` git hook   | anyone who commits in this clone      | every commit                        | ~15s   |
| GitHub Actions          | every pull request and push to `main` | on push                             | ~2 min |
| `bun run check` by hand | you, when you remember                | —                                   | ~13s   |

**CI is the only real backstop.** A Claude hook binds an agent inside Claude Code and nothing else.
A git hook binds this clone and is skipped by `--no-verify`. Only the workflow sees every change,
which is why branch protection belongs on it.

## The pre-commit hook

Tracked in `.githooks/pre-commit`. Git finds it through `core.hooksPath`, which `bun install` sets
through the `prepare` script. To wire it by hand:

```bash
bun run hooks:install
```

It skips a commit with nothing staged. A commit that stages no `.ts`, `.tsx`, `.js`, `.jsx`, `.json`
or `.sql` file runs only `format:check` and `spellcheck`, which takes under a second — a docs commit
does not pay for the test suite.

To skip it deliberately:

```bash
git commit --no-verify
```

CI runs the same command on the pull request, so a skipped hook surfaces there rather than on `main`.

**Known limitation: the hook checks the working tree, not the staged content.** If you stage part of
a file, the gate tests what is on disk, including the unstaged half. A partial stage can pass here
and still be broken as committed. Fixing that properly means stashing the unstaged changes around
the run, which is its own source of lost work. CI catches the case instead.

## The Stop hook

`scripts/check-on-stop.sh`, wired as a `Stop` hook in `.claude/settings.json`. It runs when Claude
finishes a turn, so work that fails the gate is never handed over as done. Exit 2 returns the failure
to Claude, which then has to fix it.

Three guards keep it cheap:

- **`stop_hook_active`.** A `Stop` hook that blocks is called again on the next stop. Without this
  check the pair loops for ever whenever the gate cannot be made green.
- **No changes, no run.** A turn that wrote nothing exits immediately.
- **No code, no full gate.** A turn that touched only docs runs `format:check` and `spellcheck`.

## The workflow

`.github/workflows/check.yml`. It runs on every pull request and on a push to `main`.

**It runs one job per check** — `typecheck`, `lint`, `format`, `spellcheck`, `test` — rather than the
chained `bun run check`. The chain stops at the first failure, which is right on a laptop and wrong
here: you would fix a type error, push, and only then learn about the spelling one. `fail-fast` is
off so every job reports.

It installs Node 24.18.0 as well as bun. That is deliberate: `cspell` runs on Node and its `engines`
floor is 22.18.0, and on an older Node the spelling gate does not fail — it cannot run at all.

**It generates the Expo types before checking.** `expo-env.d.ts` and `.expo/types/` are generated,
deliberately gitignored, and required to typecheck — without them `tsc` cannot resolve the
side-effect import of `@/global.css` in `src/constants/theme.ts`. The dev server writes them, so a
laptop never notices they are missing. `bunx expo customize tsconfig.json` is the documented way to
get them on CI without starting the server, and it leaves `tsconfig.json` unchanged. See the
[typed routes reference](https://docs.expo.dev/router/reference/typed-routes/).

`bun install --frozen-lockfile` fails if `bun.lock` does not match `package.json`, so a dependency
added without a lockfile update is caught here rather than on someone else's machine.

**Turn on branch protection for these checks.** Without it the workflow reports a failure and the
merge button still works, which makes the whole layer advisory. Require all five by name:
`typecheck`, `lint`, `format`, `spellcheck`, `test`.

## What is deliberately not here

- **A per-file lint hook.** ESLint on one file takes 1.8 seconds, and a `PostToolUse` hook blocks the
  agent loop on every edit. The `Stop` hook covers the same ground once per turn instead of once per
  file.
- **Typecheck per file.** TypeScript is not file-scoped. One file's error often lives in another.
- **A dead-code check.** There is none yet. `knip` is the candidate, and it belongs in CI, not in a
  hook — it is a whole-repo analysis and it is noisy until it is tuned.
