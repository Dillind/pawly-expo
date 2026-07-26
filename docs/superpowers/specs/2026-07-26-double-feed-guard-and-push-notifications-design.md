# Double Feed Guard and Push Notifications — Design

**Status:** approved, not yet implemented
**Date:** 2026-07-26
**Branches:** `feat/PAW-002-double-feed-guard` (part 1),
`feat/PAW-003-push-notifications` (part 2)

Two pieces of work, designed together because they interlock, sliced into two branches because they
ship separately.

**Part 1** closes out feed logging: a server-side Double Feed guard, a confirm-and-create sheet, and
making the already-built correction sheet reachable.

**Part 2** builds the notification spine end to end: push tokens, per-member preferences, an `alerts`
outbox, an Edge Function that delivers, and the client half that receives and deep-links.

Decisions recorded elsewhere are referenced, not restated:

- [ADR 0002](../../adr/0002-missed-feed-alert-engine.md) — missed feeds are detected server-side on a
  cron; alerts key off `logged_at`, never `created_at`.
- [ADR 0009](../../adr/0009-symmetric-grace-window-derived-slot-matching.md) — the Grace Window is
  symmetric, slot matching is derived on demand by one function in `private`, and no TypeScript may
  reimplement the window arithmetic.
- [ADR 0010](../../adr/0010-truesheet-over-expo-router-form-sheets.md) — sheets are TrueSheet.
- [CONTEXT.md](../../../CONTEXT.md) — Grace Window, Satisfying Feed, Double Feed, Feed Logged Alert,
  Missed Feed Alert.
- [Feed Logging design](./2026-07-25-feed-logging-design.md) — the `feed_logs` table, its RLS, the
  slot matcher, and the correction flow this spec completes.

## Scope

**In (part 1):** the `log_feed` RPC, the hypothetical-assignment Double Feed derivation, the
confirm-and-create sheet, deletion of `DoubleFeedSheet`, and wiring `FeedLogRow` and `SlotRow` to the
correction sheet.

**In (part 2):** EAS project and iOS push credentials, the `push_tokens` table, per-member
notification preferences, the `alerts` outbox and its trigger, the delivery Edge Function, the
rewritten `usePushNotifications`, the first-run priming sheet, and the Profile notification section.

**Out:** the missed-feed cron itself (ADR 0002 — part 2 builds the spine it will queue into, nothing
more), Android push credentials, push receipts, an in-app notifications tab, the invite flow, badge
counts, and rich/actionable notifications.

---

# Part 1 — The Double Feed guard

## What a Double Feed is

CONTEXT.md defines a Double Feed as "two feeds for effectively the same slot". Sharpened into
something the matcher can compute:

> Logging a feed at time *T* is a **Double Feed** if *T* falls inside at least one Grace Window
> **and** adding it does not increase the number of satisfied slots that day.

Both clauses are load-bearing.

The first exempts snacks. CONTEXT.md calls a log outside every Grace Window "a valid, recorded feed
that simply belongs to no slot", so a 3pm treat must never warn.

The second is the actual test, and it is derived entirely from the existing assignment in
`private.slot_states` — run the assignment with the hypothetical log included, compare the count of
satisfied slots against the count without it. No new window arithmetic exists anywhere, which is what
ADR 0009 requires.

### Why not "is the nearest slot already fed"

Because `private.slot_states` performs a *global greedy* assignment, nearest pair first, and "nearest
slot to this log" is not the same question.

Worked example. Slots at 07:00 and 08:00, Grace Window 60 minutes, an existing log at 07:05 (which
claims 07:00 at a distance of 5 minutes). A new log at 07:30 is equidistant from both slots. The
matcher processes the 5-minute pair first, so 07:00 is taken; the new log then claims 08:00. Satisfied
slots rise from one to two, so this is a genuinely useful feed. The naive check would have looked at
the nearest slot, found 07:00 already fed, and warned — a false warning on the exact behaviour the app
wants to encourage.

The counter-case works too: one slot at 07:00, existing log at 07:05, new log at 07:20. The new log
falls inside 07:00's window, but the satisfied count stays at one. Warn — correctly.

And displacement is handled: slot at 07:00, existing log at 06:00, new log at exactly 07:00. The new
log claims the slot (distance 0) and the 06:00 log becomes an orphan. Count stays at one, so it warns
— correctly, because the pet was fed at 6 and is about to be fed again.

## Where the check runs

**Inside the write, not before it.** A single RPC decides and inserts in one transaction.

```
public.log_feed(
  target_pet_id uuid,
  target_logged_at timestamptz default now(),
  target_notes text default null,
  confirmed boolean default false
) returns jsonb
```

Returns either:

```jsonc
{ "status": "logged", "log_id": "…" }
{ "status": "double_feed", "slot": { "label": "morning", "scheduled_time": "07:00" },
  "existing": { "id": "…", "logged_at": "…", "logged_by": "…" } }
```

In the `double_feed` case **nothing is written**. A second call with `confirmed: true` writes
unconditionally.

Check-then-insert as two round trips was rejected. Two people in one house both feeding the dog at 6pm
is not a hypothetical for this product — it is the scenario the feature exists for — and a check that
completes a full round trip before its own insert can tell both of them "no double feed" and let both
of them write.

`security invoker`, so RLS remains the real gate: the existing `feed_logs` INSERT policy, including the
Contributor backdating floor and the Owner exemption, applies unchanged. The client stops naming
columns entirely, which makes the narrow column grants moot rather than weakened.

### Implementation note: the signature change

`private.slot_states(uuid, date)` gains a third parameter for the hypothetical timestamp.
`create or replace function` **cannot** add a parameter — it creates an overload, and an overload
whose extra parameter has a default makes every two-argument call ambiguous and therefore an error.
The migration must `drop function private.slot_states(uuid, date)` and recreate it at the new arity,
then recreate `public.pet_slot_states` (which calls it) in the same migration, and re-apply the grants
and revokes from `20260725090600`.

## The confirm-and-create sheet

Today both `ActionPopover` primary actions call `logFeed.mutate({})` — an instant write with no notes
and a toast. That is replaced.

Tapping **Log a feed** presents `log-feed-sheet.tsx`:

- the pet and the time being logged (now),
- an optional notes field (`FEED_LOG_NOTES_MAX_LENGTH`, the existing schema),
- the line *"Everyone in the household who has feed alerts on will be notified."* — **part 2 only**;
  until notifications exist, the line would describe a feature that does not,
- one primary button, **Log feed**.

On submit it calls `log_feed` with `confirmed: false`. If the response is `double_feed`, **the sheet
stays open** and renders a warning inline: who fed the pet and when, drawn from the returned existing
log, and the button becomes **Log anyway**, which re-calls with `confirmed: true`.

Inline rather than a second sheet, for two reasons. AGENTS.md already records that a native sheet
raised while another presentation is up gets swallowed by iOS. And the warning is about the thing the
user is already looking at — pushing it onto a separate surface loses the notes they just typed.

`DoubleFeedSheet` is deleted. It has never had a caller.

### Naming

`feed-log-sheet.tsx` (view and correct an existing log) and a new `log-feed-sheet.tsx` (create one)
differ only in word order, which is a bug waiting to be written. The existing file is renamed to
**`feed-log-detail-sheet.tsx`**; the new one is **`log-feed-sheet.tsx`**.

## Making correction reachable

The correction sheet is already built — the day/time/notes form, the 24-hour Contributor window
measured off `created_at`, the Owner exemption, the notes-only fallback for older logs, and delete.
Nothing about it changes. It simply cannot be opened:

- `activity/index.tsx` renders `<FeedLogRow … onPress={() => {}} />`. It gets the real handler,
  setting `activeLogId` and presenting the sheet — the same path the deep link already uses.
- `SlotRow` is not pressable at all. A slot in the `fed` state gains a press target that opens its
  `satisfyingLogId`. Slots in other states stay inert; there is no log to open.

---

# Part 2 — Push notifications

## End-to-end flow

```
member taps Log feed
  → public.log_feed()  [transaction]
      → insert into feed_logs
      → after-insert trigger inserts one row into alerts (kind = 'feed_logged')
  → after-insert trigger on alerts calls net.http_post → Edge Function
      → resolves recipients: household members, minus the author
      → filters by each member's feed_logged_alerts preference
      → collects their push_tokens
      → POST https://exp.host/--/api/v2/push/send  (batched, ≤100 per request)
      → deletes any token whose ticket returns DeviceNotRegistered
      → stamps alerts.sent_at
  → device receives; tap opens /activity?logId=…  → correction sheet
```

The missed-feed cron (ADR 0002) later joins this at the same seam: it inserts `alerts` rows with
`kind = 'missed_feed'` and the identical delivery path carries them.

## Why an outbox rather than a direct trigger

A trigger on `feed_logs` calling the Edge Function directly would be less machinery today. It was
rejected because of what comes next.

The missed-feed cron runs every 15 minutes. A slot missed at 08:00 is still missed at 08:15, 08:30 and
every run after that, so without a durable record of "already alerted for this slot on this date" the
engine pushes *"Bailey hasn't been fed"* to the whole household four times an hour. That is precisely
the failure PRODUCT_BRIEF names as fatal — "notifications that are too noisy" — delivered by the
feature meant to prevent it. The engine needs a sent-record regardless, so building it now costs
nothing extra and avoids ending up with two delivery paths.

It also buys an audit trail (what did Pawly actually send this household last Tuesday?) and a place to
retry from.

## Data model

### `alerts`

One row per **event**, not per recipient. Recipients are resolved at send time, so a preference
changed between queue and delivery is respected.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `household_id` | uuid not null → households | the delivery audience |
| `kind` | enum `alert_kind` | `feed_logged` \| `missed_feed` |
| `subject_id` | uuid | the `feed_logs.id` or `feeding_schedules.id` it refers to |
| `subject_date` | date | null for `feed_logged`; the local date for `missed_feed` |
| `actor_id` | uuid null → users | who caused it; excluded from recipients. Null for `missed_feed` |
| `created_at` | timestamptz | |
| `sent_at` | timestamptz null | stamped by the Edge Function |
| `error` | text null | last delivery error, for the audit trail |

`unique (kind, subject_id, subject_date)` is the idempotency key that makes the missed-feed cron safe
to run every 15 minutes. `subject_date` is nullable and participates in the constraint, so
`feed_logged` rows (one per log, unique by `subject_id` alone) and `missed_feed` rows (one per slot per
day) both fit one constraint. **Note:** Postgres unique constraints treat nulls as distinct, so the
`feed_logged` half relies on `subject_id` being a fresh `feed_logs.id` each time — which it is. The
`missed_feed` half, where the guarantee actually matters, has a non-null `subject_date`.

RLS: enabled, with **no policy for `authenticated`** in this pass. Nothing in the app reads alerts yet;
the Edge Function reads with the service role. A future notifications tab adds a select policy
(household membership) and a sparse `alert_reads (alert_id, user_id, read_at)` table alongside.

**Muting silences the push, not the record.** Someone with Feed Logged Alerts off still has the rows;
they have asked not to be interrupted, not to be kept in the dark.

### `push_tokens`

| Column | Type | Notes |
| --- | --- | --- |
| `token` | text **primary key** | the Expo push token itself |
| `user_id` | uuid not null → auth.users | |
| `platform` | text not null | `ios` \| `android` |
| `created_at` | timestamptz | |
| `last_seen_at` | timestamptz | refreshed on every registration |

The token is the primary key rather than a surrogate id because the token *is* the natural key, and it
makes registration a single `insert … on conflict (token) do update set user_id = …, last_seen_at =
now()`. That conflict clause handles the case that actually bites: two accounts on one phone. Sign out,
sign in as your partner to test, and the same token is reassigned rather than left as a stale row
pushing one person's household alerts into another's session.

A single `expo_push_token` column on `users` (what Supabase's own guide does) was rejected: it caps you
at one device per account and breaks the moment you sign into a second simulator to test the feature
you are building.

RLS: a member may insert, update and delete only rows where `user_id = auth.uid()`, and **select
nothing** — no user ever needs to read a push token, including their own. The Edge Function reads with
the service role.

Lifecycle:

- **Register on sign-in and on every foreground.** Tokens rotate; `last_seen_at` gives a future
  cleanup a signal to work from.
- **Delete the row on sign-out.** A handed-down or shared phone otherwise keeps receiving a previous
  user's household alerts, which is a privacy leak rather than mere noise.
- **Delete on `DeviceNotRegistered`**, acted on immediately from the ticket.

### Notification preferences

Two boolean columns on **`household_members`**:

- `feed_logged_alerts` — default `true` for `owner`, `false` for `contributor`
- `missed_feed_alerts` — default `true` for both roles

On the membership rather than on `users` because the preference is genuinely a property of *this person
in this household*: a dog walker with four clients can mute Tuesday's and keep her own dog's alerts. It
also sits on the exact row the send query already joins to find recipients. v1 is one household per
user, so the UI is identical either way — this costs nothing now and avoids a migration later.

Defaults are set by role at insert time (in `create_household_and_pet`, and in the invite-accept path
when it exists), not enforced by role afterwards.

## Delivery rule

> A Feed Logged Alert goes to **every member of the household except the author**, unless that member
> has turned Feed Logged Alerts off.

Role does not appear in the rule.

Role-based routing — "Contributors are never notified" — was considered and rejected. It leaves the
important case unspecified: ADR 0001 allows multiple Owners, and the realistic v1 household is a
couple who are both Owners, so role-based routing notifies nobody and the v1 milestone in
PRODUCT_BRIEF ("that person receives a push notification — that's the moment the app proves its
value") cannot happen at all.

It is also the wrong axis. `Owner` and `Contributor` are permissions concepts in this codebase. The
midday dog walker may well want to know the owner already fed at 7am so she does not feed him twice —
that is the Double Feed the app exists to prevent, and role-based routing is exactly what would hide it
from her.

The annoyance the rule was meant to solve is handled by **defaults**: Contributors start with Feed
Logged Alerts off, so the paid walker is not buzzed every morning. The difference matters because
preferences are reversible and routing rules are not — a default is a toggle the user already has, a
routing rule is a migration and an ADR.

Missed Feed Alerts default on for both roles, per ADR 0002 ("the whole household gets a nudge"). That
is the one a walker must not miss.

## Edge Function

`supabase/functions/send-alerts/`.

- Invoked by an after-insert trigger on `alerts` via `net.http_post` (pg_net). Both `pg_net` and, later,
  `pg_cron` need installing — neither is currently enabled on the project.
- `verify_jwt = false`; it is called by the database, not a user. It authenticates on a shared secret
  read from Supabase Vault and passed as a header, and reads with the service role.
- Batches to Expo at **≤100 messages per request** (the documented limit; the rate ceiling is 600/s per
  project, far above anything this app will produce).
- `DeviceNotRegistered` in a returned ticket deletes that token. Any other ticket error is written to
  `alerts.error`. Success stamps `sent_at`.

### Message shape

```jsonc
{
  "to": ["ExponentPushToken[…]"],
  "title": "Dylan fed Bailey",
  "body": "7:05 am · Half a scoop, plus her tablet",
  "sound": "default",
  "data": { "screen": "/activity", "params": { "logId": "…" } }
}
```

Times render in the **household's** timezone, never the recipient's device timezone — the same rule
every other surface follows. Author name uses `formatAuthorName`'s convention (first name), so the
notification agrees with the Home slot row, the Activity row and the detail sheet. The body drops the
` · notes` half when there are no notes.

`data.screen` and `data.params` are the shape `usePushNotifications` already reads, and
`/activity?logId=…` is a deep link `activity/index.tsx` already handles.

## Client

### `usePushNotifications`, rewritten

The existing hook has never been mounted, and has three defects to fix rather than preserve:

1. `token` is assigned only inside `if (isIOS)`, so Android can never register even once credentials
   exist.
2. The handler sets the deprecated `shouldShowAlert: true` alongside `shouldShowBanner: false` and
   `shouldShowList: false`. In SDK 57 that means a notification arriving while the app is foregrounded
   displays **nothing**.
3. Permission is requested on mount, wherever that mount happens to be.

The rewritten handler:

```ts
{ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }
```

Badges are off in this pass — a badge count implies an inbox to clear, and there isn't one yet.

**Cold start.** `addNotificationResponseReceivedListener` alone is not reliable for a tap that launches
the app from terminated. The hook uses `useLastNotificationResponse()`, deduplicating on the
notification's request identifier via a ref, which also removes the existing `isNavigatingRef`
`setTimeout(…, 1000)` hack. Navigation waits until the user is signed in and has a household —
otherwise a cold-start tap tries to push `/activity` at the auth stack.

**Mounting.** Inside `AuthGate` in `src/app/_layout.tsx`, where a `userId` exists and the router is
mounted.

### Permission prompt

Registration and the OS prompt are separate decisions. Registration is attempted on every sign-in and
every foreground. The **prompt** fires once, from a first-run priming sheet on Home.

Onboarding is `pet-details → feeding-schedule`, and `feeding-schedule.tsx:80` calls
`create_household_and_pet`, which flips `hasHousehold` and makes `(onboarding)` unreachable. Priming
inside onboarding would therefore have to sit *before* the schedule exists, where the pitch is abstract
("we'll notify you about feeds") rather than concrete ("we'll tell you if Bailey's 7am is missed"). A
sheet on Home the first time it renders gets the concrete pitch, touches neither the guard nor ADR
0007's explicit-creation rule, and keeps a permission dialog out of the three-second logging loop. It
needs one persisted "has been primed" flag.

`allowProvisional` — permission with no dialog at all, alerts landing quietly in Notification Centre —
was considered and rejected. It sidesteps the one-shot problem, but a provisional Feed Logged Alert
makes no sound and shows no banner, and "your partner just fed the dog" is worthless if you find it
tomorrow.

### Profile notification section

Driven by `getPermissionsAsync()`, which returns `canAskAgain` and `ios.status`:

| State | UI |
| --- | --- |
| `NOT_DETERMINED` | a row that presents the priming sheet |
| `AUTHORIZED` | both toggles, live |
| `DENIED` | both toggles **disabled**, one explanatory line, an **Open Settings** button |

The denied copy states the consequence and nothing more: *"Notifications are turned off for Pawly, so
you won't hear when someone feeds Bailey."* plus `Linking.openSettings()`.

Disabling the toggles is the point. A toggle reading "on" while iOS silently drops every push is the
app lying about its own state — the same trust failure PRODUCT_BRIEF says makes people delete it.

Apple's guideline 4.5.4 forbids *requiring* push for an app to function; it does not forbid telling
someone their notifications are off and offering a route to Settings. Pawly is comfortably inside that
— logging, Activity, slots and correction all work with notifications off; only the alerts are lost.
The lines not to cross: do not gate content behind it, do not imitate a system alert, do not nag.

Permission is re-read on foreground so returning from Settings updates the screen immediately; the
root layout already has an `AppState` listener to hang that off.

`provideAppNotificationSettings` is included in the permission request, so iOS shows a button inside
its own settings page that deep-links back into Pawly's notification screen.

## Prerequisites

- **`eas init`** — `app.config.ts:84` currently reads `projectId: isProd ? '' : ''`. Both empty, so
  `getExpoPushTokenAsync` throws today. Needs no Apple account and can be done first.
- **A paid Apple Developer Program membership** (purchased 2026-07-26; enrolment typically completes
  within 24–48 hours). Expo's servers talk to APNs using a push key generated against your Apple team;
  without it there is no delivery to iOS, simulator included.
- **An APNs key** generated through EAS credentials once enrolment is active.
- **A rebuilt dev client** carrying the push entitlement.
- **A second household member.** `household_members` has one row; a Feed Logged Alert to a household of
  one is unobservable. Created by hand for now — the invite flow does not exist.

Push **does** work on the iOS Simulator (Xcode 14+, macOS 13+, iOS 16+), so the iPhone 17 Pro simulator
on iOS 26.5 is a valid verification target. No physical device is required.

Android is out of scope for this pass: FCM v1 credentials and `google-services.json`
(`app.config.ts:33`, commented out) are a separate credential exercise for a platform PRODUCT_BRIEF
calls second. The schema, the Edge Function and the Expo API are all platform-agnostic; only the
notification channel setup is deferred.

## Verification

Everything except the last hop is provable before credentials exist:

- **Recipient resolution, preference filtering, payload construction** — invoke the Edge Function
  directly with seeded members and fake tokens. Expo returns a `DeviceNotRegistered` ticket for a
  well-formed but invalid token, so "we resolved the right two members, skipped the author, honoured
  the mute, and built a valid payload" is provable against the real API.
- **The whole client half** — foreground banner, tap handling, cold-start tap, and the
  `/activity?logId=…` deep link into the correction sheet — via **local** notifications carrying an
  identical `data` payload. That exercises every line of the hook except token acquisition.

What remains untestable until enrolment completes is `getExpoPushTokenAsync` returning a real token and
the Expo → APNs → device transport. Both are Expo's code.

Layout and on-device claims are **measured** via argent's `describe`, never asserted from a screenshot.

---

## Sequencing

**`feat/PAW-001-feed-logging`** (current branch)

1. ~~Commit the existing `ActionPopover` work.~~ Done, as `59b0d7f`.
2. `FeedLogRow onPress` and a pressable fed `SlotRow` — reaching the correction sheet, which the
   Double Feed guard no longer blocks. Ships here rather than with the guard.
3. The corrected time moves onto the native `mode="time"` spinner.
4. PR.

**`feat/PAW-002-double-feed-guard`** (off `main` after PAW-001 merges)

5. `log_feed` RPC and the hypothetical-assignment derivation, including the drop-and-recreate of
   `private.slot_states` and `public.pet_slot_states`.
6. `log-feed-sheet.tsx` with the inline Double Feed warning; rename `feed-log-sheet.tsx` to
   `feed-log-detail-sheet.tsx`; delete `double-feed-sheet.tsx`; rewire both `ActionPopover` primary
   actions.

**`feat/PAW-003-push-notifications`** (off `main` after PAW-002 merges)

7. `eas init` and `projectId`; APNs credentials and a rebuilt dev client once enrolment is active.
8. `push_tokens`, the preference columns, `alert_kind`, `alerts`, both triggers, `pg_net`, the
   `send-alerts` Edge Function.
9. `usePushNotifications` rewritten and mounted; the priming sheet; the Profile section; the
   "who will be notified" line added to `log-feed-sheet.tsx`.
10. End-to-end verification with a second account.

## Documentation to update

- **CONTEXT.md** — add **Alert** (a queued notification to household members; a Feed Logged Alert or a
  Missed Feed Alert). Sharpen **Double Feed** to the definition above.
- **AGENTS.md** — a note that the only write path for a feed log is `log_feed`, not a table insert.
- **ADR** — the delivery rule (universal, with role-based defaults) is hard to reverse, surprising
  without context, and the result of a genuine trade-off. It earns ADR 0012. The outbox choice belongs
  in the same ADR, since its justification is the missed-feed cron's idempotency.

## Open items

- **Push receipts are deferred.** Part 2 acts on ticket-time errors only. Expo recommends fetching
  receipts ~15 minutes after sending, which catches failures tickets do not. Add a receipts sweep when
  `pg_cron` is installed for the missed-feed engine — a schedule entry against machinery that will
  already exist. **Come back to this.**
- **Four test feed logs and a nonsense schedule in the dev database.** All four
  logs are 26 July, Bailey, no notes, not backdated. Three (3:05, 3:19, 3:20 pm)
  fall outside every Grace Window and are useful fixtures for the snack case;
  the fourth (4:25 pm) satisfies dinner. The schedule itself is test data —
  `lunch` 12:00, `morning` 13:00, `dinner` 17:00, 60-minute window — so Home
  renders "Morning — 1:00 PM". The overlapping lunch/morning windows make the
  spec's worked counter-example (a log equidistant between two slots) reachable
  without constructing anything, so both are kept deliberately. Fix the schedule
  through the app once editing a schedule exists.
  The fourth log's time was moved during PAW-001's on-device verification and now
  sits at Brisbane 2026-07-25 23:38 with the notes `Notes only edit`; it no longer
  satisfies dinner. Nothing was deleted and the count is still 4.
- **Times display in UTC, not the household's timezone.** Measured on device
  during PAW-001: a log stored `2026-07-25 13:38+00` renders as "1:38 PM" where
  `Australia/Brisbane` should give "11:38 PM". The write path is correct —
  `composeLoggedAt` resolves the entered time in the household zone and stores the
  right instant — so this is read-side only, in `formatTimeOfDay` /
  `timeInTimezone` / `dayInTimezone`, all of which call `dayjs(...).tz(zone)`.
  The most likely cause is Hermes shipping without the full ICU data that dayjs's
  timezone plugin needs, in which case `.tz()` silently returns UTC rather than
  throwing. It predates PAW-001 and is out of its scope, but it misstates every
  time in the app and mislabels day boundaries for a travelling member, so it
  wants its own ticket before anything ships.
- **The sub-iOS-26 glass fallback is unverified.** ADR 0011's fallback passes typecheck but no build
  has ever run on an 18.6 simulator. Deferred to its own check before any real release.
- **`disableTransparentOnScrollEdge`** in `app-tabs.tsx` is questionable now that `minimizeBehavior` is
  gone. Not revisited.
- **The invite flow does not exist**, so the second household member is created by hand. This is the
  next feature after PAW-002 and the last thing standing between the app and the v1 milestone.
- **Notes on a backdated feed have no create path.** The forgot-to-log case ("I fed him at 7, it's now
  9") still means logging now and correcting the time, which will raise a Double Feed warning against a
  slot the log is about to move out of. Acceptable for now; revisit if it bites.
