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

**A `cron.schedule(...)` in a migration does not mean the job is running.** `cron.job.active` lives
only in the database. Toggling it in the dashboard leaves no trace in the repo, and a fresh
`cron.schedule` creates the job active — so `supabase db reset` and the qa project both look healthy
while production is silent. `sweep-missed-feeds` was switched off in production on 2026-07-31 and
nobody was told about an unlogged feed for four weeks. The migration is not the source of truth here;
`select jobname, schedule, active from cron.job` is. Re-enable with
`select cron.alter_job(job_id := 1, active := true)`.

It was switched off over a cost worry that does not apply. pg_cron has no billed unit on Supabase:
compute is charged by instance uptime rather than by query, and the Free plan has no compute billing
at all. Edge Function invocations are the metered thing, and one happens per `alerts` row inserted —
never per sweep that finds nothing.

**`insert ... select` does not coerce a bare string literal to an enum column; `insert ... values`
does.** The same literal that works in a `values` list fails in a `select` list with *"column kind
is of type alert_kind but expression is of type text"*. This bit `queue_post_commented_alert`, which
fans one comment out to several recipient rows and therefore had to be a `select`. Inside a trigger
it surfaces as the *insert on the parent table* failing, so the error names `post_comments` and not
the alert at all. Cast explicitly: `'post_commented'::public.alert_kind`.

**Changing what `list_alerts` returns needs a `drop function`, not `create or replace`.** Postgres
refuses to change a function's return type in place, and the returned `table (...)` is part of it.
Adding one column to the inbox means dropping and recreating, and the `grant` has to be reissued
after — a dropped function takes its grants with it.

**A `check` constraint cannot read another row.** Two invariants on `post_comments` — that a reply
belongs to the same post as its parent, and that its parent is itself top-level — need a
`before insert` trigger instead. Neither is reachable through the app, which only ever offers a
top-level id as a parent; they exist because the table has to refuse the row on its own, and a
service-role script is a writer the UI does not mediate.

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

**A `daterange` is never null, so "the current version" is not a PostgREST filter.** The live
version of a Feed Time is the one whose range has an open upper bound, and `upper(effective) is
null` cannot be expressed over REST — `.is('effective', null)` silently matches nothing and the
editor renders an empty list with no error. `public.pet_feed_times` exists for exactly this. The
same trap catches any "current row" query built on a range instead of a boolean flag.

**`extract(dow ...)` is 0=Sunday; `isodow` is 1=Monday.** `feed_times.days_of_week` uses the
first. Swapping them shifts every weekday-only feed by one day, and nothing fails — the feed just
turns up on the wrong days.

**`dayjs.tz` is broken under Hermes in BOTH its forms.** The instance `.tz()`
silently returns UTC. The *static* `dayjs.tz(string, format, zone)` was believed safe and is not —
measured on device it returned instants about fourteen minutes off, varying by call. Nothing in
`src/lib/dates.ts` may use either. Zone arithmetic goes through `Intl.formatToParts` (`zonedParts`,
`instantAt`). This was live: the feed-log correction sheet saved wrong instants.

**RHF `formState` from `useFormContext()` does not subscribe a child component.** The Proxy only
computes what the component owning `useForm` reads, so `isDirty` reads `false` forever in a child —
which silently disabled the add-pet discard confirmation. In a child, use
`useFormState({ control })`. Reading `formState.x` inside a callback subscribes nothing at all.

**A picker fires no blur, so `mode: 'onTouched'` never clears its error.** The member fixes the
field and the message stays. `DateTimePickerValidated` calls `trigger(name)` after a confirm for
exactly this; any new non-text input needs the same.

**Column-level grants on `feed_logs` bite every new column.** `authenticated` has INSERT on a named
list, and `log_feed` is `security invoker` — so a column added without a matching `grant insert`
fails with "permission denied for table feed_logs", surfaced as "Something went wrong. Try again."
Adding a column to that table means adding the grant.

**A custom bar item stretches the next screen's back button.** iOS animates the left bar-item group
across a push, so a `Stack.Toolbar.View` on the outgoing screen hands its geometry to the incoming
back button — which draws its background as a wide rectangle instead of a circle until the
transition ends. Adding `hidesSharedBackground` to the custom item makes it worse, not better: with
no background to hand over, the stretch runs for the whole push. Prefer a native
`Stack.Toolbar.Button`; if the control has to be custom, leave its shared background alone.

**A collapsed wrapper makes `Stack.Title asChild` look broken.** A `View` that hugs its content
measures to nothing in the native title slot, so the bar shows the route name — `index`, not the
switcher — and the title reads as unsupported. It is not: give the wrapper an explicit `width` and
it registers. A width wider than the slot also left-aligns the content, because UIKit centres the
slot itself. See `home/_layout.tsx`.

**`Stack.Screen` reads its direct children only.** A shared header component compiles, renders, and
silently leaves the bar showing the route name. Nothing warns. Share the style, never the
components — `HeaderTitleStyle` in `constants/theme.ts` is the shared piece.

**`SheetRow` only works inside a sheet.** It fills with `backgroundSheetRow`, which in the light
palette is `#F1F2F5` — the screen background. Used on a screen the rows lose their fill entirely and
read as plain labels rather than as something tappable. It looks fine in dark mode, so this only
shows up in a light-mode pass. On a screen, use a card on `backgroundElement`.

## TanStack Query

**There is no `pets` query key.** The pet lists are derived from the `households` query, so
`invalidateQueries({ queryKey: ['pets'] })` matches nothing and fails silently — the list keeps
showing the old name, the old photo, or a pet that has been removed. Anything that writes to a pet
invalidates `['households']`.

**A persisted query is dropped unless `gcTime` outlives `maxAge`.** The restore puts the query into
the cache, garbage collection takes it out again before anything observes it, and the screen paints
empty exactly as it did before persistence was added. Nothing warns. Both live in
`src/lib/query-client.ts`; `gcTime` is a day and `maxAge` is the same day.

**Cached data has to be cleared when a session ends.** AsyncStorage is per-device, not per-account,
so the next person to sign in on the phone paints from the last one's cache. `useCacheReset` watches
the auth status, because a revoked or expired token never passes through the logout button.

## This repo

**`docs/agents/` is gitignored.** `git add` skips new files there silently; `git add -f` is the only
way one reaches a commit.

**ADR numbers have collided** when two agents worked in parallel. Take the next number from
`ls docs/adr/`, never from memory, and assume someone else may be doing the same.

**Files sometimes change under you** — a deleted file reappearing, a comment silently removed.
Stage your own paths explicitly rather than `git add -A`, and ask rather than restoring.

**A push payload embeds a route path, so a route change is a deploy-order problem.**
`supabase/functions/send-alerts/message.ts` carries the path the notification opens. Ship the app
build first, then redeploy the Edge Function. Redeploying first sends a path the installed build
cannot resolve, and the tap lands on **Unmatched Route** — which looks like a routing bug in the app
and is not one.

**A lone `GlassView` over a flat background renders no circle at all.** Glass refracts what is
behind it, so over a page painted one colour there is nothing to work with — on black the close
button was a bare teal glyph, and on the light page a bare dark one. Both times it looked like the
material had failed. It had not; there was nothing to sample. Where the design wants the iOS glass
circle, put a `Stack.Toolbar.Button` in a native header and let the bar draw it. Reach for
`variant="glass"` only over content.

**A full-screen `BaseModal` never feels native.** `react-native-modal` runs its animation through
Animatable in JS. Side by side with a native push at the same duration the difference is obvious,
and no tuning of `animationIn` closes it. A surface that fills the screen belongs on the stack.
