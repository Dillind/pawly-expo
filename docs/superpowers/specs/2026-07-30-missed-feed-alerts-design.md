# CRU-005 — Missed Feed Alerts

## What this builds

The second of the two alert types. When a Scheduled Time passes with no Satisfying Feed, the household gets a push saying nobody has logged that feed.

Detection is a `pg_cron` sweep inside the database. It inserts an `alerts` row; the existing `alerts_dispatch` trigger and `send-alerts` Edge Function deliver it.

## Why most of this already exists

PAW-003 built the outbox and left this half deliberately unfinished. What is already in place:

- `private.slot_states(pet_id, date, hypothetical_at)` returns `state = 'missed'` per slot, in the household timezone, using the symmetric Grace Window. All the detection maths is done.
- `public.alert_kind` already has a `missed_feed` value.
- `public.alerts` has `subject_date`, and `alerts_idempotency_idx` is unique on `(kind, subject_id, subject_date)`. The comment on that table says in as many words that the index exists so this sweep can run every 15 minutes safely.
- `household_members.missed_feed_alerts` exists, defaults to `true`, and the toggle already ships on the notifications screen.
- `resolveRecipientTokens` already has a branch for `actor_id` being null, annotated as the missed-feed case.

So the work is: a sweep, the copy, and three small gaps in `send-alerts`.

## The framing decision that shapes the copy

The app cannot tell a missed meal from a missed tap. It only ever knows the second one.

Most people do not forget to feed their dog. They forget to log it. So a push reading "Bailey hasn't been fed" is usually the app confidently reporting something false — the exact trust collapse PRODUCT_BRIEF names as fatal ("if the app makes it look like the pet wasn't fed when it actually was, trust collapses instantly").

Every copy string in this feature therefore describes the **absent record**, never the absent meal:

> **No one has logged Bailey's morning feed**
> Due 7:00 am

This wording is deliberately uncertain, and it does two jobs at once. The person who fed at 7am and forgot reads it as "oh right, let me log that." The person at work reads it as "nobody has logged it, I should check." Both readings are correct and both lead somewhere useful.

This is why the feature was **not** split into a personal logging reminder and a household coordination alert. One push, honestly phrased, serves both. Splitting them would cost the coordination feature, which is the product thesis.

## Architecture

```
pg_cron (*/15)
  └─ private.sweep_missed_feeds()
       ├─ per pet: dormancy check
       ├─ per pet × {today, yesterday} local date: private.slot_states(...)
       ├─ filter: state = 'missed' AND grace closed within last 30 min
       └─ insert into alerts (kind = 'missed_feed', subject_id = schedule_id,
                              subject_date = local date, actor_id = null)
                 on conflict do nothing
                       │
                       ▼
            trigger alerts_dispatch  (unchanged)
                       │  pg_net
                       ▼
              send-alerts Edge Function
                       ├─ branch on alert.kind
                       ├─ resolveRecipientTokens: filter on missed_feed_alerts
                       └─ buildMissedFeedMessage
```

### Why the sweep is in the database, not an Edge Function

ADR 0002 said this would be a scheduled Edge Function. That ADR predates the outbox.

ADR 0012 split queueing an alert from delivering one. Detection **is** queueing, and every other thing that queues an alert in this system is already a database trigger. An Edge Function sweep would give us two places that insert `alerts` rows, in two languages, and the new one would be the awkward one: its whole body would be a loop calling a SQL function, because ADR 0009 puts all Grace Window arithmetic in `private.slot_states` and forbids reimplementing it in TypeScript. It would be one network round trip per pet to reach code already reachable for free.

The database sweep also gets idempotency for nothing. `alerts_idempotency_idx` already enforces one missed-feed alert per slot per local date, so the insert is `on conflict do nothing` and a double run is harmless by construction rather than by care.

**This needs a new ADR (0013)** retiring the mechanism half of ADR 0002. ADR 0002's other decisions — timezone on the household, per-household grace window, "any feed in the window", keying off `logged_at` — all stand.

## The sweep

```sql
create function private.sweep_missed_feeds() returns integer
```

`security definer`, `set search_path = ''`, owned by `postgres`. The inner call to `private.slot_states` is `security invoker`, so it runs as the sweep's owner; `postgres` bypasses RLS, which is what lets one function see every household. Nothing grants execute on the sweep to `authenticated`.

Returns the number of alerts inserted, so a manual `select private.sweep_missed_feeds();` during verification says something useful.

### Which slots it considers

Two filters, both narrow.

**Lookback: grace closed within the last 30 minutes.** Anything older is never alerted.

This is what stops the first run after deploy inserting an alert for every slot every household has ever missed and pushing all of them at once. It also means a sweep outage loses those alerts permanently, which is accepted: a missed feed alert is only useful while you can still act on it, and a nudge about breakfast arriving after lunch is noise rather than a safety net. 30 minutes is two cadence intervals, so one skipped run still catches up.

**Local date: today and yesterday.** Scheduled Times are wall-clock with no date. Sweeping both local dates covers a slot near local midnight whose grace window closed on the previous local day. Cost is negligible — a feeding schedule is 2–4 rows per pet.

### Dormancy: the Nudge Limit

Someone installs Crumpet, sets a three-a-day schedule, uses it a week, drifts. Without a stop, the schedule generates three nudges a day forever about a dog they are feeding perfectly well. That is the single largest uninstall risk in this feature.

**Rule: count the `missed_feed` alerts recorded for this pet since its most recent Feed Log. Once that count reaches 3, insert no more for that pet.** So a pet gets exactly three nudges and then goes quiet. Logging any feed resets the count to zero, because the count is measured from the last log.

```sql
-- The reset point is feed_logs.created_at, NOT logged_at.
select max(feed_logs.created_at) into last_log_created_at
from public.feed_logs where feed_logs.pet_id = <pet>;

select count(*)
from public.alerts
join public.feeding_schedules on feeding_schedules.id = alerts.subject_id
where alerts.kind = 'missed_feed'
  and feeding_schedules.pet_id = <pet>
  and (last_log_created_at is null or alerts.created_at > last_log_created_at);
```

**This is the one place in the feature that reads `created_at` rather than `logged_at`**, and it is deliberate. Everywhere else `logged_at` is correct, because everywhere else the question is when the pet ate — ADR 0002 says so explicitly. Here the question is whether a human is still using the app. Someone who backdates a log to yesterday morning has just proved they are active, but their `logged_at` is old, so keying off it would leave them silenced. `created_at` never moves and answers the question actually being asked.

Chosen over "stop if nobody has opened the app in N days" because it needs no new tracking and uses the signal the feature is already about.

Three, not six: the reset is on *any* feed log, so reaching 3 in a row means the household logged nothing at all for roughly a day. That is already a strong dormancy signal, and 6 means two days of unwanted nudges before we stop. The cost of 3 is that a household with one chaotic unlogged day goes quiet the next morning, when a nudge might have helped. Accepted — silence recovers instantly on the next log, whereas noise gets the app deleted.

The number is a judgement, not a derivation, same as the 30-minute backdating rule.

Two details:

- **Counted per pet, not per household.** One dormant pet must never silence another.
- **The check is re-evaluated as the sweep inserts.** A pet sitting at 2 must not insert three slots in one run and land at 5. The sweep tracks a local counter and stops at the limit, rather than reading the count once per pet.

A pet with no Feed Log at all has `last_logged_at = null`, so every missed-feed alert ever recorded for it counts. A household that set up a schedule and never logged anything gets 3 nudges and then silence. That is correct.

### Why no grouping across pets

A household with three pets on the same schedule gets three pushes at 8am, not one.

Kept that way for v1. Generic copy ("your household pets need food logging") does not say which pet or which meal, so it is not actionable — the named version is the useful one. Grouping would also need a different `subject_id` and a different uniqueness rule, since a grouped alert has no single `schedule_id`, which means reworking the index that makes the sweep safe. Multiple pets in the UI is v2 and paywalled per PRODUCT_BRIEF.

In practice the pushes land together and iOS stacks same-app notifications, so the volume reads milder than the count suggests.

**Known consequence for the multi-pet ticket:** if per-pet volume turns out to be a real complaint, grouping is the fix, and it starts by changing what `subject_id` means for `missed_feed`.

### Boundary double-push: nothing to build

Grace closes at 08:00, the sweep nudges, and someone logs at 08:05.

- If they say they fed at 07:00, that log is 65 minutes old, so `queue_feed_logged_alert` marks it `suppressed_reason = 'backdated'` and no second push goes out. One notification.
- If they actually fed at 08:05, both pushes fire, but they state two true and different things in the right order: nobody had logged breakfast, then Dylan fed Bailey.

Both outcomes are already correct under existing rules. No change.

## Changes to `send-alerts`

Three, all small.

**1. `index.ts` — branch on kind.** Today: `if (alert.kind !== 'feed_logged') return new Response('Unsupported kind')`. That line goes. The `feed_logged` path fetches the feed log; the `missed_feed` path fetches the slot instead, via `subject_id` as a `feeding_schedules.id`:

```
feeding_schedules → scheduled_time, label, pets ( name, households ( timezone ) )
```

The `alerts` select gains `subject_date`.

**2. `recipients.ts` — filter on the right preference column.** It currently filters `.eq('feed_logged_alerts', true)` unconditionally, which would silence missed-feed alerts for everyone whose feed-logged toggle is off. The column becomes a function of `alert.kind`. The existing `actor_id` exclusion already no-ops for missed feed, since `actor_id` is null.

**3. `message.ts` — `buildMissedFeedMessage`.** Pure, no network, matching `buildFeedLoggedMessage`.

```
title: `No one has logged ${petName}'s ${labelText} feed`
body:  `Due ${time}`
data:  { screen: '/home', params: {} }
```

`labelText` reuses the lowercase vocabulary already in `log-feed-sheet.tsx` — `morning` / `lunch` / `dinner`, and `custom` renders as `scheduled`. Three surfaces rendering one slot must not invent three names for it; `message.ts` already carries that comment about author names.

`time` formats `scheduled_time` in the household timezone with the same `Intl.DateTimeFormat('en-AU')` helper the file already has.

The deep link goes to `/home`, not `/activity`. A feed-logged tap opens the log you were told about; a missed-feed tap should land where you can log the missing one. `usePushNotifications` pushes `data.screen` with `data.params` unchanged, so an empty params object needs no hook change.

## Error handling

- **Sweep raises.** pg_cron records the failure in `cron.job_run_details` and the next run tries again. No alerts row is written, so nothing is half-sent. The sweep does not wrap per-pet work in its own exception handler in this pass: a raise means a bug worth seeing, not a pet worth skipping quietly.
- **Vault secrets missing.** `dispatch_alert` already writes `error = 'dispatch skipped: vault secrets missing'` and leaves the row pending. Unchanged.
- **Push fails.** Existing `send-alerts` behaviour: unstamped on throw so `alerts_pending_idx` still finds it, `DeviceNotRegistered` tokens deleted.
- **No recipients** (household of one, or everyone muted). Existing behaviour: stamped `sent_at` with `error = 'no recipients'`. Correct for missed feed too, and it is the common case until invites ship.

## Verification

There is no test runner in this repo, so this is manual and the sweep is built to be callable by hand.

1. `select private.sweep_missed_feeds();` with no missed slots — returns 0, inserts nothing.
2. Set a schedule slot in the recent past with no feed log. Run the sweep. One `alerts` row, `kind = 'missed_feed'`, `subject_date` = the local date.
3. Run it again immediately. Still one row. This is the idempotency index doing its job.
4. Age the slot past 30 minutes. Sweep inserts nothing.
5. Insert three missed-feed alerts for a pet with no later feed log. Sweep skips that pet. Log a feed. Sweep nudges again.
6. On device: confirm the push wording, and that tapping lands on Home.
7. Turn `missed_feed_alerts` off for the one member. Sweep still writes the row; `send-alerts` stamps `no recipients`. Muting silences the push, not the record.

Step 6 needs a real device. Simulators do not receive APNs, and PRODUCT_BRIEF flags this specifically.

## Documentation to update in the same change

- **New ADR 0013** — missed-feed detection is a database sweep. Retires the mechanism half of ADR 0002.
- **CONTEXT.md, `Missed Feed Alert`** — state that the copy names the missing *log*, not the missing meal. Without this line the next person to touch the wording writes "Bailey hasn't been fed" again.
- **CONTEXT.md, new term `Nudge Limit`** — after 3 consecutive Missed Feed Alerts for a pet with no Feed Log in between, alerts stop for that pet until someone logs a feed.

## Out of scope

- Grouping alerts across pets. See above.
- Notification preferences during onboarding. Discussed and deferred: asking someone to configure notifications before they have used the app asks a question they cannot answer, and the likely outcomes are "accepted every default" or "defensively muted everything". Revisit when the full set of notification types exists, and consider disclosure ("here is what we will send you") rather than configuration.
- Retrying pending alerts. `alerts_pending_idx` exists for a future sweep; nothing reads it yet.
- In-app notification history. Needs a select policy on `alerts` plus an `alert_reads` table, per the table's own comment.
- Per-schedule grace windows. PRODUCT_BRIEF has these as a paywall candidate.
