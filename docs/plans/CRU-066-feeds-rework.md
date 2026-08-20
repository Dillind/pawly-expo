# CRU-066 — Feeds rework: implementation plan

Branch: `feat/CRU-066-feeds-rework`. Written 2026-08-19, for handover.

**Read first, in this order:** [ADR 0029](../adr/0029-a-feed-log-names-the-feed-it-satisfies.md),
[ADR 0030](../adr/0030-feed-times-are-versioned-not-edited.md), then `CONTEXT.md`. The two ADRs
are the decisions. This file is only the order of work.

Design is settled. Do not reopen it. If something here looks wrong, it is more likely that this
file is stale than that the ADRs are — check them, then ask.

## What is being built, in one paragraph

A feed log stops being a pet plus a timestamp and becomes a pet plus **the feed it satisfies**.
Feed times gain days-of-week, free-text instructions, and effective-dated versions so editing one
cannot rewrite the past. The Grace Window keeps only its notification job. "Slot" is retired
everywhere for **Feed Time** on screen and **Occurrence** in code.

## Wireframes

Two Wirekitty canvases. **The source of truth is in this repo**, not the links — the hosted
previews can go stale, be revised by someone else, or stop resolving.

    docs/plans/wireframes/pet-creation-and-logging.json   13 screens
    docs/plans/wireframes/home-states.json                 6 screens

Each file is the Wirekitty shorthand schema: one entry per screen, `screen` naming it, `children`
describing it. Readable as-is, and it can be pushed back to Wirekitty with `create_wireframe` to
see it drawn again.

The live previews, which need the Wirekitty MCP server and may not resolve later:

**Pet creation, logging, the feed editor, the explainer** — 13 screens:
<https://app.wirekitty.dev/?fetchFrom=https%3A%2F%2Fmcp.wirekitty.dev%2Fwireframe%2Ff3bf65d0-5c12-40a0-944a-41935e91a4f0.json&callback=https%3A%2F%2Fmcp.wirekitty.dev%2Fwebhook&wireframeId=f3bf65d0-5c12-40a0-944a-41935e91a4f0>

**Home states** — 6 screens, covering the working day, everything done, a feed overdue, a pet with
no feeds yet, a paused pet, and the single-pet case:
<https://app.wirekitty.dev/?fetchFrom=https%3A%2F%2Fmcp.wirekitty.dev%2Fwireframe%2F0c3fd19d-e211-44d9-93cd-985e8f696a5c.json&callback=https%3A%2F%2Fmcp.wirekitty.dev%2Fwebhook&wireframeId=0c3fd19d-e211-44d9-93cd-985e8f696a5c>

Two notes on where the drawings and the plan differ, both decided since:

- Screen 2b shows a free-text **Name** field. That was rejected — **the enum stays**. Render the
  four labels with `SegmentedControl` or a `SheetRow` picker, not a text input.
- Home keeps one uniform card layout whether there is one pet or five. Screen F asks whether the
  card wrapper is noise for a single pet. **Still open**, and safe to leave: it is a layout
  choice inside phase 5, not a schema one.

## Order of work

Six phases. **Each is its own commit** and each leaves the app working. Do not start a phase
before the one above it is green.

### 1. Schema

New migration, named `<timestamp>_feed_times.sql` following the existing convention.

- `feed_times` — one row per **version**: `id`, `pet_id`, `series_id`,
  `label public.feeding_schedule_label`, `local_time time`, `days_of_week smallint[]`,
  `instructions text`, `effective daterange`, `created_at`.
  **Keep the existing enum** (morning / lunch / dinner / custom) — free-text names were
  considered and rejected for now. `FEEDING_SCHEDULE_LABEL_OPTIONS` in `src/constants/options.ts`
  already holds the four, so the picker needs no new data. Add `exclude using gist (series_id with =, effective with &&)`, which needs
  `create extension if not exists btree_gist`.
- `pet_pauses` — `pet_id`, `during daterange`, `reason text`.
- `feed_logs` gains `feed_time_series_id uuid null` and `occurrence_date date null`. Both null
  means an Extra Feed. Unique on `(feed_time_series_id, occurrence_date)` where not null —
  this is what makes Double Feed a fact rather than a guess.
- `pets` gains `pet_type` — an enum of **`dog`, `cat`, `other`** only. Leave a TODO on the type:
  more species are expected, and adding a value to a Postgres enum is `alter type ... add value`,
  which cannot run inside a transaction with other DDL. Worth knowing before the day it matters.
- Backfill: each existing `feeding_schedules` row becomes the first version of its own series,
  `effective` starting at its `created_at` date in the household timezone. That is exactly what
  `slot_states_new_slots_start_tomorrow` already means by
  `(created_at at time zone household_timezone)::date < target_date`.
- RLS on both new tables, mirroring `feeding_schedules`.

**Keep `feeding_schedules` in place until phase 4 is merged.** Dropping it in the same migration
turns a reversible step into a cliff.

### 2. Occurrences and the read path

- `private.feed_occurrences(pet_id uuid, target_date date)` — expands the feed times in effect on
  that date, filtered by `days_of_week`, minus any pause covering it. Returns series id, name,
  local time, instructions.
- Rewrite `private.slot_states` to read from it. **Keep its greedy assignment and its
  `at time zone` arithmetic verbatim.** Only the CTE that fetches the day's expected feeds
  changes. Rename to `private.occurrence_states` in the same commit.
- A log now names its occurrence, so the matcher reads `feed_logs.feed_time_series_id` rather
  than inferring from the timestamp. Logs with a null series are Extra Feeds and satisfy nothing.

### 3. `log_feed` and the alerts edge

- `log_feed` takes `target_series_id uuid default null` and `target_occurrence_date date default
  null`. Keep the advisory lock and the single transaction — what changes is what is checked.
  `double_feed` now means "this occurrence already has a log", which is a lookup, not a guess.
- **`alerts.subject_id` must hold the `series_id`, not a row id.** The idempotency index is
  `(kind, subject_id, subject_date)`; under versioning a row id changes on every edit, so a
  household would be re-notified about a day it was already told about. **Six migrations join
  `alerts.subject_id` to `feeding_schedules.id`** — find them with
  `grep -rn "subject_id" supabase/migrations/*.sql`. All of them need the new join, including
  `list_alerts` and every later redefinition of it.
- Drop the suppression rule that silences a log more than 30 minutes late. ADR 0029 explains why.
- Missed-feed sweep: unchanged in shape, but it reads occurrences and skips paused pets.

### 4. Services and hooks

- `feeding-schedule.service.ts` → `feed-time.service.ts`. `FeedingSlot` → `FeedTime`,
  `upsertSlot` → `saveFeedTime` (which closes a version and opens a successor, never updates in
  place), `deleteSlot` → `endFeedTime` (closes the range; never deletes).
- `use-schedule-mutations.ts` → `use-feed-time-mutations.ts`; `useSlotStates` → `useOccurrences`.
  Keep the destructure-and-rename convention: `const { mutate: saveFeedTime, isPending: isSaving }`.
- `useLogFeed` takes the occurrence. Its toasts stay at the call site — a `double_feed` is a
  success that must confirm nothing.
- New `SuccessMessage` / `ErrorMessage` entries. No string literals at call sites.
- **Now** drop `feeding_schedules`, in its own migration.

### 5. UI

Invoke `/frontend-design` and `/expo-native-ui` before writing any of this, and
`/expo-animation` before the log row. Not after.

- **Add a pet** becomes a modal (`presentation: 'modal'`) with three pushed steps. Cancel on
  step 1 only; Back on 2 and 3. An action sheet confirms discarding once anything is typed.
  Pet type and the feed editor are **pushed screens inside the flow**, never sheets — a sheet on
  a modal is two modals, which Apple's modality guidance and `AGENTS.md` both reject.
- Adopt `SegmentedControl` for sex and for the date-of-birth / approximate-age choice. It needs a
  `name` prop and `useFormContext` first, like every other validated input — without it, it
  cannot render its own `FieldError`.
- Give `ScreenScrollView` an `isKeyboardAware` prop backed by `KeyboardAwareScrollView`.
  `KeyboardProvider` is already at the root. Three forms currently solve this three ways;
  `care-card-editor.tsx` can drop its hand-rolled `KeyboardAvoidingView`.
- **Home**: a card per pet, a row per occurrence, `Log` on each unlogged one. Done cards collapse.
- **Log sheet**: instructions visible, `Fed at` defaults to now, multi-pet selection.
- **Correcting a log.** Tapping a logged row opens it for edit — change the time, change the note,
  delete it. `useUpdateFeedLog` and `useDeleteFeedLog` already exist, so this is a surface, not a
  feature. It is the only way to fix a mistake, and it is deliberately an edit on the row rather
  than a second flow. Deleting is destructive, so it confirms with an alert carrying
  `style: 'destructive'`.
- **Retire `DropdownPickerValidated` from these forms.** Two options is a segmented control; five
  is a `BaseSheet` + `SheetRow` list.
- On finish, land on the pet's screen. It is the summary, and it teaches where to edit later.
- The explainer sheet is reachable, never a gate.

### 6. Tests

**Deferred, deliberately.** Come back to this once phases 1 to 5 are done. It is the last phase
and nothing above it depends on it — but do not let it be quietly dropped, because it is the only
thing that can verify any of the SQL.

**The test target already exists.** A second Supabase project was created for it on 2026-08-20:

| | |
| --- | --- |
| Name | `crumpet-qa` |
| Project ref | <!-- cspell:disable-line -->`zkckgmvykrmswnjxvfii` |
| Region | `ap-northeast-2`, matching production |
| Organisation | dylan-personal |
| Cost | free tier |

All 67 migrations are applied there and it matches production: 18 tables, 46 functions, 47 RLS
policies, the same seven `alert_kind` values in the same order, and the missed-feed cron job.

**Never point the tests at production.** `supabase db reset` drops and recreates the database, and
production holds real households. Worse without any reset: inserting a `feed_logs` row fires a
trigger into `alerts`, then `pg_net`, then the `send-alerts` Edge Function — so a test that logs a
feed would send **real push notifications to real devices**.

**On QA the outbox is inert, and not because anything was disabled.** `dispatch_alert` reads its
URL and secret from Vault. Those secrets were deliberately not created on QA, so the function takes
its own early-exit path: it writes `dispatch skipped: vault secrets missing` on the alert row and
makes no HTTP call. QA therefore stays identical to production, and a test can still assert that an
`alerts` row was queued. **Do not create those secrets on QA.**

Two things to know about the QA project:

- **The missed-feed sweep runs there**, every fifteen minutes, same as production. Harmless while
  it is empty; it will accumulate rows once test data exists. Remember that before asserting an
  alert count.
- **Its migration history is ten batches, not 67 files.** Several objects are defined repeatedly
  across the migrations — `slot_states` five times, `create_post` four, `list_alerts` five — and
  only the final definition of each was applied. The schema matches production, which was verified
  by comparing counts. The *history* does not, so `supabase migration list` will not line up.

Still to do before the first assertion:

1. Install Docker and the Supabase CLI. Neither was on the development machine as of writing.
2. Link to `crumpet-qa`, not to production. Check twice.
3. `create extension if not exists pgtap`, add `supabase/tests/`, add a `test:db` script.

Then cover, at minimum:

- Editing a feed time does not change what a past day means.
- Overlapping versions of one series are rejected by the exclusion constraint.
- A paused day expects no occurrences and nudges nobody.
- A second log against one occurrence is refused unless confirmed.
- An Extra Feed satisfies nothing.
- A DST transition day has the right number of occurrences. Run under `TZ=UTC`,
  `America/New_York` and `Pacific/Kiritimati`, as the Jest suite already is.

Jest keeps the pure logic and the row↔domain mapping in the service. It cannot reach any of the
above — that is the whole reason this phase exists. Run `bun run check` before finishing.

**Every migration from phase 1 onward has to be applied to both projects**, or QA drifts and stops
being worth having.

## Naming map

| Old | New |
| --- | --- |
| Slot, Scheduled Time | Feed Time (on screen), Occurrence (in code) |
| `feeding_schedules` | `feed_times` |
| `slot_states` | `occurrence_states` |
| `useSlotStates` | `useOccurrences` |
| `upsertSlot` / `deleteSlot` | `saveFeedTime` / `endFeedTime` |
| Extra Feed (accidental) | Extra Feed (deliberate — "Log something else") |

## Sharp edges

1. **`alerts.subject_id`.** The one that bites in production rather than in review. See phase 3.
2. **Timezones.** A feed time is a wall-clock time in the household's timezone. Keep the existing
   `at time zone` arithmetic; do not "simplify" it. The suite runs under `TZ=UTC`,
   `America/New_York` and `Pacific/Kiritimati`, and it must stay that way.
3. **Route moves.** Typecheck passes on a route that no longer resolves, and push payloads in
   `supabase/functions/send-alerts/message.ts` embed route paths. Redeploy the Edge Function if
   any path changes, and open every moved route on a simulator.
4. **`DropdownPickerValidated` has an `.ios.tsx` variant.** Change both or iOS silently keeps the
   old behaviour.
5. **Native surfaces need a device.** The time wheel, the sheets, the segmented haptic. Jest
   renders mocks and will pass over a dead control.

## Do not

- Do not materialise future occurrences. ADR 0030 says why.
- Do not add interval scheduling ("every 8 hours"), assignment, or a calendar. All three were
  considered and deliberately left out.
- Do not add structured portions. Instructions are free text on purpose.
- Do not reintroduce a symmetric Grace Window. It exists to time a nudge, nothing else.
- Do not show the word "Missed" to a member, ever.

## Verify on device before calling it done

The simulator is enough for most of it. These are the ones worth doing deliberately:

- Log a feed two hours late. It stays that feed, the household is told, nothing says Extra or
  Missed.
- Two members log the same feed. The warning names who and when.
- Edit a feed time, then scroll back a week. Yesterday reads as it did yesterday.
- Pause a pet across a day that had feeds. No rows expected, no nudge.
- Add a pet with the keyboard up on every step.
- Dark mode on all of it.
