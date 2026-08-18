# Knowledge

Things that cost time to find out. Read this before debugging something that feels like it should
already work.

Each entry is a trap, not a tutorial. If it is documented in the tool's own docs and easy to find,
it does not belong here.

---

## Tooling

**`bun run spellcheck` fails on Node 20 in agent shells.** cspell requires ≥22.18, so it exits
non-zero for a reason that has nothing to do with spelling — and `bun run check` stops there. Volta
pins Node 24 for interactive shells but agent tool calls can get an older one. Call it directly:

```bash
~/.volta/bin/npx cspell --no-progress "**/*.{ts,tsx,md,sql}"
```

**A fresh git worktree has no `node_modules` and no `expo-env.d.ts`** — both gitignored. Typecheck
fails on `@/global.css` before you have touched anything. Run `bun install` and copy
`expo-env.d.ts` from the main checkout.

**Squash merges break stacked PRs.** Retarget the child to `main` *before* merging the parent, never
pass `--delete-branch` (deleting a base branch **closes** the child and it cannot be reopened), then
`git rebase --onto main <old-parent-tip>`. A PR can report `MERGEABLE` while still carrying its
parent's pre-squash commits — check the diff's file list, not the merge state.

## Verification

**Typecheck passes on a route that does not resolve.** Expo Router's generated types go stale after
files move, and a broken route still compiles. It shows up on device as **Unmatched Route**. Always
open a moved route on a simulator.

**`opacity: 0` removes a view from the iOS accessibility tree.** An invisible-but-focusable control
— a text field under a custom-drawn one, for instance — must use a transparent *colour* instead.
With `opacity: 0` the field vanishes from the AX tree entirely and VoiceOver cannot reach it, so the
control cannot be used at all. Verified against the live tree in `verification-code-input.tsx`.

**An `accessibilityLabel` on a wrapper overrides the text inside it.** A countdown or a live value
rendered as a child is then never announced. If the label would restate the visible text, omit it.

**Jest cannot see native surfaces.** TrueSheet, the SwiftUI picker, native tabs are all mocked. A
test calling `onValueChange` on a mocked `Switch` passes happily while the real control is dead on
device — this is exactly how the Feed Logged Alerts toggle shipped broken.

## Supabase

**Supabase auth errors are written for developers.** "Token has expired or is invalid", "Invalid
login credentials". Never let them reach a toast — `toUserFacingError` in `src/lib/auth-errors.ts`
maps on `error.code`, not the message, because the message is prose the platform can reword.

**Resending an email is rate-limited by `max_frequency`** (60s on hosted projects), so a resend
button without a countdown reliably fails. The remaining seconds are only ever in the error message;
`retryAfterSeconds` parses them, and the server's number beats any local timer.

**Hosted email sending is heavily throttled**, separately from `max_frequency`. Expect to run out
while testing an email flow. Custom SMTP (AWS SES) is the fix and is not done yet.

**`enable_confirmations = false` in `config.toml` is the local setting only.** The live project's
auth settings are not in the repo — check the dashboard before concluding what the server does.

**Google sign-in has "Skip nonce checks" on, deliberately.** `signInWithApple` generates a nonce and
`signInWithGoogle` does not — that asymmetry is forced, not an oversight. Supabase expects the
provider to store a *hashed* nonce (SHA-256, hex), which is Apple's behaviour; Google stamps the raw
value in, so the comparison cannot succeed whatever you pass — see
[supabase/auth#1829](https://github.com/supabase/auth/issues/1829). Choosing our own nonce is a
paid feature of
`@react-native-google-signin/google-signin`. Without the toggle, every Google sign-in dies on
"Passed nonce and nonce in id_token should either both exist or not." The cost is replay protection
on the token, which is small here because the native SDK returns it in-process — there is no
redirect to intercept. Turn the check back on if Supabase fixes the comparison or we buy the library.

## Simulator

**`simctl` typing drops and reorders characters.** Use `delayMs: 100`+ and verify the field with
`describe` before trusting what you typed.

**The dev-menu bubble intercepts taps** in the top-right corner. Turn "Tools button" off if it
swallows a tap on a header control.

**Two simulators are in use.** iPhone 17 Pro is signed out and is the one for auth work. iPhone 17
Pro Max holds a live session with real data — **do not sign it out**.

## This repo

**`docs/agents/` is gitignored.** `git add` skips new files there silently; `git add -f` is the only
way one reaches a commit.

**ADR numbers have collided** when two agents worked in parallel. Take the next number from
`ls docs/adr/`, never from memory, and assume someone else may be doing the same.

**Files sometimes change under you** — a deleted file reappearing, a comment silently removed.
Stage your own paths explicitly rather than `git add -A`, and ask rather than restoring.
