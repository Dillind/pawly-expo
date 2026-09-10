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

**A font added to the `expo-font` config plugin is not in the build until you prebuild, and iOS
does not complain.** `ios/` already exists, so `expo run:ios` compiles the project it finds and the
plugin never re-runs — the app installs, launches, and every heading silently falls back to San
Francisco, because iOS resolves an unknown family name to the system font without an error. It
looks like the font simply is not very distinctive. Run `bunx expo prebuild -p ios`, then check the
built app rather than the screen:

```bash
/usr/libexec/PlistBuddy -c "Print :UIAppFonts" ios/Crumpet/Info.plist
```

Two more traps in the same area. **iOS resolves a family by its PostScript name** (`Inter-Regular`,
`Gabarito-SemiBold`) and every other platform by the file name (`Inter_400Regular`) — that is why
`InterFontFamily` is a `Platform.select` and not one list. And the names are in the file, not
guessable: read them out of the `name` table rather than assuming a pattern.

**A fresh git worktree has no `node_modules` and no `expo-env.d.ts`** — both gitignored. Typecheck
fails on `@/global.css` before you have touched anything. Run `bun install` and copy
`expo-env.d.ts` from the main checkout.

**Squash merges break stacked PRs.** Retarget the child to `main` _before_ merging the parent, never
pass `--delete-branch` (deleting a base branch **closes** the child and it cannot be reopened), then
`git rebase --onto main <old-parent-tip>`. A PR can report `MERGEABLE` while still carrying its
parent's pre-squash commits — check the diff's file list, not the merge state.

## Verification

**Typecheck passes on a route that does not resolve.** Expo Router's generated types go stale after
files move, and a broken route still compiles. It shows up on device as **Unmatched Route**. Always
open a moved route on a simulator.

**`opacity: 0` removes a view from the iOS accessibility tree.** An invisible-but-focusable control
— a text field under a custom-drawn one, for instance — must use a transparent _colour_ instead.
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

**Making a unique index partial breaks every `on conflict` that named it, and the failure hides.**
Postgres infers a partial unique index as an `on conflict` arbiter only when the statement repeats
the index predicate. CRU-086 added `where kind <> 'feed_due'` to `alerts_idempotency_idx`, and
`sweep_missed_feeds` still said a bare `on conflict (kind, subject_id, subject_date)`. From that
moment its insert raised 42P10 — and the sweep's own per-pet `exception when others` caught it and
downgraded it to a warning, so `cron.job_run_details` kept saying **succeeded** and no household
would ever have been told about a missed feed again. Two things follow. **Repeat the predicate:**
`on conflict (...) where kind <> 'feed_due' do nothing`. And **grep for every `on conflict` naming
an index before you make that index partial** — `select proname, pg_get_functiondef(oid) from pg_proc`
finds them in seconds. Jest cannot reach any of this, and a green cron log is not evidence: a sweep
that finds nothing never reaches its insert.

**`create or replace function` keeps the old ACL, so a stale grant survives a rewrite.** A migration
that ends `revoke all ... from public; grant execute ... to authenticated;` reads as if it locked the
function down, and it does not: `public` is not `anon`, and a direct grant to `anon` from an earlier
migration is still there afterwards. `unread_alert_count` was callable without signing in for weeks
because every rewrite of it copied that same pair of lines. `list_alerts` was safe only because its
migration happened to name `anon`. Name both: `revoke execute ... from public, anon`. The Supabase
security advisor reports this as _Public Can Execute SECURITY DEFINER Function_, and it is the only
thing that will tell you.

**A `pg_net` dispatch does not fire until the transaction commits, so you cannot wait for it in the
same one.** `insert into alerts ...; select pg_sleep(8); select ... from alerts` always reports the
row as still pending, because `net.http_post` only queues the request and the queue is drained after
commit. It looks exactly like a broken trigger. Run the insert, then read the row back in a
_separate_ statement a few seconds later.

**`insert ... select` does not coerce a bare string literal to an enum column; `insert ... values`
does.** The same literal that works in a `values` list fails in a `select` list with _"column kind
is of type alert_kind but expression is of type text"_. This bit `queue_post_commented_alert`, which
fans one comment out to several recipient rows and therefore had to be a `select`. Inside a trigger
it surfaces as the _insert on the parent table_ failing, so the error names `post_comments` and not
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
provider to store a _hashed_ nonce (SHA-256, hex), which is Apple's behaviour; Google stamps the raw
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
silently returns UTC. The _static_ `dayjs.tz(string, format, zone)` was believed safe and is not —
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

**Typecheck and Jest cannot see a missing native module.** Home shipped `expo-linear-gradient`,
`tsc` passed, all 232 tests passed, and the device showed a red box reading
`Unimplemented component: <ViewManagerAdapter_ExpoLinearGradient>`. A JS-only dependency works the
moment it installs; a native one is inert until a new dev client is built and installed on every
machine. So **adding any native package is a dev-build change, not a code change** — plan the build
into the work rather than reaching for a substitute at the point the red box appears.

**A screen that only ever showed today can hide date-bound write bugs.** The week strip made past
days reachable and instantly exposed three: the Log chip, "Just log a feed" and "Other"
all wrote against `now()` while the card showed another day. Nothing failed loudly — the feed would
have been recorded against the wrong date. When a screen gains a date control, audit every write
path on it for which date it actually targets.

**Reduce Motion is verifiable on the simulator, and worth verifying.**
`xcrun simctl spawn <udid> defaults write com.apple.Accessibility ReduceMotionEnabled -bool true`,
then restart the app. Take two full-resolution screenshots about a second apart and diff them: with
the setting on the banner gave 0% pixel change, and with it off the sun was the only changed region
on the screen. That proves both halves — the loop stops, and nothing else was animating.

**A `private.*` function is invisible to the app.** PostgREST exposes `public` only, so a read that
works perfectly in the SQL editor returns "function not found" from the client. Every screen-facing
read needs a `public` wrapper — `pet_reminders` over `private.reminder_occurrences`, the same split
`pet_occurrence_states` already makes.

**A component defined inside another component is a new TYPE every render.** React unmounts the old
tree and mounts a new one, so a text input inside it loses focus on every keystroke. The Reminder
Tray's three steps are module-level for this reason, taking their values as props. A `useMemo` with
an empty dependency array does not fix it either — it freezes the steps on the first render's
values, and typing then updates nothing.

**A new `household_members` preference column needs a `grant update (col)`.** The table takes
COLUMN-level grants, so without it PostgREST reports success and the value reverts on the next
refetch. Silent in both directions.

**An absolutely positioned indicator will cover a sibling drawn in flow.** The week strip's gold
underline sits at `bottom: 6` of the row, and the Reminder dots landed in the same four pixels — so
the dot vanished on exactly one day, the selected one, which is the day you are looking at. It read
as "the query is broken" and was a stacking problem. Check the selected state as well as the
unselected one whenever a cell gains a second indicator.

**`formatScheduledTime` parses a Postgres `time`, which has seconds.** A value straight from the
time picker does not — it stores `HH:mm` — and `dayjs(value, 'HH:mm:ss')` renders that as
"Invalid Date" on screen rather than throwing. It now accepts both shapes.

**A `.ios.tsx` file cannot import its shared half from the plain name.** Metro resolves
`./month-popover` to `month-popover.ios.tsx` on iOS — the importing file itself — so the import
comes back `undefined` and the screen throws "Element type is invalid". The shared half needs its
own third file, which is what `month-trigger.tsx` is.

**`contentOffset.x` does not name the page in a LegendList.** The list anchors and adjusts its own
scroll offset as it renders, so `Math.round(offset / pageWidth)` picks the wrong index — the week
strip paged backwards with it. Read the visible item from `onViewableItemsChanged` instead. Guard
that callback while scrolling programmatically: a jump of several pages makes each week in between
briefly visible, and the strip would select all of them on the way past.

**A recycled LegendList page does not repaint on a state change it does not own.** The week strip's
selected day moved and the pill stayed on the old cell. `extraData` is what tells the list the
pages are stale; nothing warns you, and the data itself looks correct.

## Every date picker was capped at today

`DateTimePickerValidated` hard-coded `maximumDate={mode === 'date' ? new Date() : undefined}`. That
is right for a birthdate and wrong for a Reminder, and it was the real reason a Reminder could only
ever be today's: the Zod schema accepted any date, the service wrote any date, and the calendar
simply drew every future day greyed out.

Nothing catches this. Typecheck passes, the schema passes, the tests pass, and the tray opens and
looks correct -- the only symptom is that tapping a future day does nothing at all. If a date field
will not take the date you are giving it, read the picker's bounds before you read the schema.

The prop is now `bound`, which is `'past'` by default so no existing call site changed.

## A hook that reads the active household is wrong on a screen you chose

`useHouseholdMembers()` took no argument and resolved the active household through `useHousehold()`.
That is right for Home and the pet screens, which follow the switcher. It is wrong for any screen
reached by _choosing_ a household: tapping the second row in Profile → Settings opened a Members
list for the first one, and nothing about the screen said so. The name in the header was correct,
because that came from the route param; only the data was from somewhere else.

It now takes an optional `householdId` and falls back to the active household. `useHouseholdById`
exists for the same reason — a settings screen must never call `useHousehold()`.

The general shape: a hook whose result depends on ambient state is safe only while the screen that
reads it is also chosen by that state. The moment a route carries an id, every hook beneath it has
to take that id, and the compiler cannot see the difference.

## An RLS policy's own subqueries are filtered by RLS

The `users` policy that lets a Follower see who wrote a Post was written inline:

```sql
using (
  exists (
    select 1
    from public.household_follows f
    join public.household_members m on m.household_id = f.household_id
    where f.follower_id = auth.uid() and f.status = 'accepted' and m.user_id = users.id
  )
)
```

It returns nothing, always. A policy expression runs as the querying user, so the join to
`household_members` is itself filtered by that table's own select policy — and a Follower is not a
member of the household, which is the entire point of a Follower. Every Post rendered authorless.

Nothing about this looks wrong. The SQL is correct, the migration applies, typecheck passes, and
the feed loads with a name missing from each card rather than an error anywhere.

This is what every other predicate in `private.` is for: `security definer` plus `set search_path
= ''`. The rule is that a policy body may only test the row in front of it and call a definer
function. A join written directly in `using (...)` is a bug waiting for the first user who is not
already a member.

Found by `supabase/tests/follow.test.sql`, which is the only thing in the repo that runs a policy.

## The bare `commit;` in a migration is not a workaround for the CLI

`alter type ... add value` cannot be followed by a use of that value in the same transaction, and
the Supabase CLI wraps each migration file in one. `20260909090200_follow_request_alerts.sql`
answers that with a bare `commit;` after the `alter type`, which ends the wrapper's transaction
early and leaves the rest of the file in autocommit.

That is verified rather than assumed: `supabase/tests/README.md` runs every migration a second time
wrapped in `begin; ... commit;` and the file applies unchanged. The trailing `commit` the wrapper
adds is a no-op warning, not an error.

## A Supabase update that matches no row is not an error

`PostService.markSeen` writes `posts_last_seen_at` on `household_members`. The Posts tab called it
with the merged scope — member households and followed households together — and a followed
household has no membership row. The update matched nothing, returned no error, and ran once per
focus for every followed household.

Nothing surfaces this. There is no exception, no toast, no console line, and the dot it was meant
to clear belongs to a household that never had one. PostgREST answers a zero-row `update` with
success, which is correct and is exactly what hides the bug.

The rule: an id from the merged Posts scope is not interchangeable with a membership id. Anything
writing to `household_members`, `alerts` or any other member-scoped table takes `memberIds`.

## An unfollow made a Comment authorless, and a Removal did not

`20260910090000` widened `can_see_user` so a Follower's name renders beside words they wrote. Its
header explains the case it fixed: a **removed** Follower stays visible, because their Comments
survive removal and hiding the user row would leave those Comments with no author.

That reasoning is right and the fix was incomplete. A Removal keeps the row, as `removed`, so a
branch still matched. **An unfollow deletes the row**, so nothing matched — and the exact failure
the migration exists to prevent happened on the commonest path. The household saw
**"Removed member"** against a comment they had replied to, and a grey placeholder in the likers
row. That person was never a Member and was never removed.

Nothing in the code looks wrong. The four branches read as a complete set, and each one is correct.
The gap is only visible if you notice that three of them key on a row that one of the two exit paths
deletes.

The rule, which is ADR 0036's: **a Follow governs future access; it never erases the past.** So the
two branches added by `20260910110000` key on the words rather than on the relationship — if I can
read the Post, I can read the name of whoever wrote or liked it. Any future predicate about who can
be seen has to answer the same question: what happens to this when the follow row is gone?

Both new branches filter by author, and neither column was indexed. `post_comments` carried only
`(post_id, created_at)` and `(parent_id)`, and `post_likes` only `(post_id)`. Without the two
indexes in that migration, naming one person on one Post card is a sequential scan.

## A grep over source lines misses half of what it is looking for

`scripts/check-boundaries.sh` first matched imports line by line. Three shapes walked straight
through it, and each one leaves a real violation in the tree while the hook reports success:

- **A multiline import.** Prettier wraps a long one across several lines, so `import { TrueSheet,`
  and `} from '...'` are never on the same line as each other.
- **A double-quoted specifier.** `from "lucide-react-native"` does not match a pattern written with
  single quotes. `bun run format` rewrites the quotes afterwards, so the violation survives and the
  evidence of how it got in does not.
- **A parent directory.** A basename-only naming check accepts `src/components/Bad/thing.tsx`.

The fix is to match against a normalised copy — comments dropped, quotes folded, whitespace removed
— rather than against the file as written.

**The second half of the lesson is the sweep.** The corrected path check flagged 54 of 360 real
files on its first run, because Expo Router route groups are `(parentheses)` and the pattern did not
allow them. A hook that exits 2 blocks the work, so a false positive is worse than the hole it
closes. Never change that script without running it over all of `src/` — the command is in
[docs/conventions/agent-hooks.md](./conventions/agent-hooks.md).

## The repo could not typecheck from a clean clone, and only CI could tell you

`tsc --noEmit` passed on every laptop and failed the moment it ran on a fresh checkout:

```
src/constants/theme.ts(5,8): error TS2882: Cannot find module or type declarations
for side-effect import of '@/global.css'.
```

`expo-env.d.ts` and `.expo/types/` carry that declaration. Both are generated by the Expo dev
server, both are gitignored on purpose, and the file itself says not to commit it. So every machine
that had ever run `bun run start` had them, and no machine that had not could compile.

The fix is `bunx expo customize tsconfig.json` before the typecheck. It writes both, needs no dev
server, and leaves `tsconfig.json` untouched. It is in `.github/workflows/check.yml`.

**The general trap: a gate that only ever runs on a developer machine is testing the machine.** This
one had been broken for as long as the file had been gitignored, and nothing could surface it until
something ran the gate somewhere clean.

## Removing a screen can leave a `Stack.Protected` branch with no screen in it

`(onboarding)/_layout.tsx` held two guarded branches — `guard={needsName}` for the `name` step and
`guard={!needsName}` for the `username` step. CRU-129 deleted the username step, and deleting only
the `<Stack.Screen>` would have left:

```tsx
<Stack.Protected guard={!needsName}></Stack.Protected>
```

Typecheck passes. Lint passes. The navigator has a guard that can be true and nothing to render
behind it.

**Whenever you delete a screen, look at what encloses it, not just the file.** A route group is the
usual case: the last screen leaving a guard, or leaving the group itself, is invisible to every
static check the repo runs.

## A write to a `households` column with no UPDATE grant fails silently

`grant update (name, timezone, grace_window_minutes, handle, is_listed) on public.households to
authenticated` is column-level. A write to any other column reports success, and the value is gone
on the next refetch. There is no error to catch.

This bites the moment a column is added. Add the column to the grant in the same migration that adds
the column, or route the write through a SECURITY DEFINER RPC. CRU-126 added `handle` and
`is_listed` that way.

## `handle_available` cannot filter on `is_listed`, and a reviewer will ask it to

The handle namespace is global. `handle_available` therefore answers about every Household,
Listed or not, and a reviewer reading it as a discovery leak will suggest adding
`and is_listed` to the predicate.

Do not. An unlisted Household occupies its handle exactly as a Listed one does. Filter there and
the function reports a taken handle as free, the Owner saves, and `households_handle_unique`
refuses the write with a Postgres error the screen has no copy for. The feature breaks and the
leak does not close — the unique violation on save answers the same question, one guess at a time.

What the function reveals is the minimum a unique namespace must reveal: that some Household holds
a given string. It names no Household. There is no route from a handle to a Household except
search, and search is the thing `is_listed` governs. The mitigation that was taken is the grant:
`authenticated` only, never `anon` as `username_available` was — see
[DECISIONS.md](./DECISIONS.md).
