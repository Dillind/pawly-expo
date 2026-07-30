# CRU-005 Missed Feed Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a Scheduled Time passes with no Satisfying Feed, push "No one has logged Bailey's morning feed" to the household.

**Architecture:** A `pg_cron` job runs `private.sweep_missed_feeds()` every 15 minutes. The sweep calls the existing `private.slot_states` for each pet, and inserts an `alerts` row for each slot that came back `missed`. The existing `alerts_dispatch` trigger and `send-alerts` Edge Function deliver it. Nothing about the delivery path changes — only `send-alerts` learns a second `kind`.

**Tech Stack:** Postgres 17 (Supabase), `pg_cron` 1.6.4, `pg_net` 0.20.4 (already installed), Deno Edge Functions, Expo Push.

**Spec:** [docs/superpowers/specs/2026-07-30-missed-feed-alerts-design.md](../specs/2026-07-30-missed-feed-alerts-design.md)

## Global Constraints

- **There is no test runner in this repo** and this plan does not add one. Verification is executable SQL with stated expected output, plus a real-device check. Do not scaffold vitest/jest/pgTAP — that is a separate decision, noted in Out of Scope.
- **Read the versioned Expo docs** before touching Expo/React Native APIs: https://docs.expo.dev/versions/v57.0.0/ . This plan touches no app code, so it should not come up.
- **User-facing copy is Australian/British English.** "No one has logged", "organise", "colour".
- **Copy names the absent log, never the absent meal.** Never "Bailey hasn't been fed". The app cannot tell a missed meal from a missed tap.
- **Prettier:** 100-char width, single quotes, no trailing commas, `bracketSameLine: true`, no tabs.
- **Every SQL function gets `set search_path = ''`** and fully-qualified names (`public.pets`, not `pets`).
- **A new function in `private` is born with PUBLIC EXECUTE.** Always `revoke execute ... from public`. Never grant the sweep to `authenticated`.
- **Comments: write fewer than you want to.** This codebase has been over-commented and it is a standing complaint. Write **exactly** the comments the plan's code blocks show and not one more. Do not add a comment because a line looks important. Do not restate what the code says, do not write JSDoc on obvious signatures, and do not narrate the change — that is the commit message's job. If the reasoning is architectural it belongs in the ADR, not above the function.
- **`bun run spellcheck` fails on Node 20** in non-interactive shells. Use:
  ```bash
  PATH="$HOME/.volta/tools/image/node/24.18.0/bin:$PATH" node node_modules/.bin/cspell --no-progress "**/*.{ts,tsx,md,sql}"
  ```
- **Never pipe a gate to `tail` or `head` and read the exit code as success.** Run the gate, read the whole output.
- **Branch:** `feat/CRU-005-missed-feed-alerts` (already created; the spec commit `4d65006` is on it).
- **Do not push unless asked.**

## Order matters

Tasks 1–3 teach `send-alerts` about `missed_feed`. Only then do tasks 4–5 start producing those rows. Doing it the other way round queues alerts the Edge Function answers with `Unsupported kind`, leaving pending rows to clean up.

## Where the SQL runs

There is no local Supabase stack running. Migrations in this repo have been applied to the **live `crumpet` project**, and this plan continues that.

Two consequences the implementer must respect:

- Every verification step that writes data has an explicit revert step. Run it.
- Verification will send real push notifications to real devices. That is intended for step 6 of Task 4, and it is why the device check lives there.

Apply migrations with the Supabase MCP `apply_migration` tool (name = the migration filename without `.sql`), and run verification queries with `execute_sql`. Write the file into `supabase/migrations/` as well so the repo stays the source of truth.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/functions/send-alerts/message.ts` | **Modify.** Widen `ExpoMessage['data']['params']`. Add `buildMissedFeedMessage` and the wall-clock time formatter. Stays pure — no network, no database. |
| `supabase/functions/send-alerts/recipients.ts` | **Modify.** Pick the preference column from `alert.kind`. |
| `supabase/functions/send-alerts/subjects.ts` | **Create.** Reads the row an alert points at and returns message content. This is the only place that knows `subject_id` means a `feed_logs.id` for one kind and a `feeding_schedules.id` for the other. |
| `supabase/functions/send-alerts/index.ts` | **Modify.** Orchestration only: authenticate, load the alert, delegate to `subjects.ts` and `recipients.ts`, send, stamp. |
| `supabase/migrations/20260730090000_sweep_missed_feeds.sql` | **Create.** `private.sweep_missed_feeds()` plus its revokes. |
| `supabase/migrations/20260730090100_schedule_missed_feed_sweep.sql` | **Create.** `pg_cron` extension and the every-15-minutes job. |
| `docs/adr/0013-missed-feed-detection-is-a-database-sweep.md` | **Create.** Retires the mechanism half of ADR 0002. |
| `CONTEXT.md` | **Modify.** Sharpen `Missed Feed Alert`; add `Nudge Limit`. |

---

## Task 1: Missed-feed copy

**Files:**
- Modify: `supabase/functions/send-alerts/message.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type MissedFeedInput = { petName: string; label: ScheduleLabel; scheduledTime: string }`
  - `type ScheduleLabel = 'morning' | 'lunch' | 'dinner' | 'custom'` (exported)
  - `buildMissedFeedMessage(input: MissedFeedInput): Omit<ExpoMessage, 'to'>`
  - `ExpoMessage['data']` becomes `{ screen: string; params: Record<string, string> }`

- [ ] **Step 1: Widen the message data type**

`buildFeedLoggedMessage` hardcodes `params: { logId: string }`. A missed-feed tap carries no params, so the type has to widen. `{ logId }` still satisfies `Record<string, string>`, so the existing call site is unaffected.

In `message.ts`, replace the `ExpoMessage` type:

```ts
export type ExpoMessage = {
  to: string[];
  title: string;
  body: string;
  sound: 'default';
  data: { screen: string; params: Record<string, string> };
};
```

- [ ] **Step 2: Add the label vocabulary and the wall-clock formatter**

Add below the existing `timeOfDay` helper.

Two things for the implementer to know, which is why the one comment below earns its place: `scheduled_time` is a Postgres `time`, already wall-clock in the household timezone, so it must not go through `timeOfDay` — that function applies a timezone, and applying one to a value that already has one shifts it. And the label words are copied from `src/components/bottom-sheets/log-feed-sheet.tsx` rather than invented.

```ts
export type ScheduleLabel = 'morning' | 'lunch' | 'dinner' | 'custom';

// Matches slotLabelText in log-feed-sheet.tsx.
const slotLabelText: Record<ScheduleLabel, string> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'scheduled'
};

// A Postgres `time` is already wall-clock in the household timezone, so
// timeOfDay would apply a second one.
const wallClockTime = (time: string): string => {
  const [hoursText, minutes = '00'] = time.split(':');
  const hours = Number(hoursText);
  const period = hours < 12 ? 'am' : 'pm';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${minutes} ${period}`;
};
```

- [ ] **Step 3: Add the builder**

Append to `message.ts`:

```ts
export type MissedFeedInput = {
  petName: string;
  label: ScheduleLabel;
  scheduledTime: string;
};

// Names the absent log, never the absent meal -- see ADR 0013 and CONTEXT.md.
export const buildMissedFeedMessage = (input: MissedFeedInput): Omit<ExpoMessage, 'to'> => ({
  title: `No one has logged ${input.petName}'s ${slotLabelText[input.label]} feed`,
  sound: 'default',
  body: `Due ${wallClockTime(input.scheduledTime)}`,
  data: { screen: '/home', params: {} }
});
```

That one comment stays because the wording is a decision someone could "helpfully" rewrite to "Bailey hasn't been fed". Everything else in the function is self-evident.

- [ ] **Step 4: Verify by hand**

There is no test runner. Check the pure function by reasoning against these cases, and confirm each one reads correctly:

| `petName` | `label` | `scheduledTime` | Expected title | Expected body |
|---|---|---|---|---|
| Bailey | `morning` | `07:00:00` | No one has logged Bailey's morning feed | Due 7:00 am |
| Bailey | `lunch` | `12:00:00` | No one has logged Bailey's lunch feed | Due 12:00 pm |
| Bailey | `dinner` | `17:30:00` | No one has logged Bailey's dinner feed | Due 5:30 pm |
| Bailey | `custom` | `00:15:00` | No one has logged Bailey's scheduled feed | Due 12:15 am |

The two cases worth checking deliberately are `12:00` (must be `12:00 pm`, not `0:00 pm`) and `00:15` (must be `12:15 am`).

- [ ] **Step 5: Run the gates**

```bash
bun run typecheck
bun run lint
PATH="$HOME/.volta/tools/image/node/24.18.0/bin:$PATH" node node_modules/.bin/cspell --no-progress "**/*.{ts,tsx,md,sql}"
```

Expected: typecheck clean; lint reports only the two pre-existing warnings (`src/app/_layout.tsx:20` require-imports, `src/components/screens/auth/auth-footer-link.tsx:25` empty-pattern); cspell 0 issues.

`tsconfig.json` may not cover `supabase/functions` (Deno, `npm:` specifiers). If typecheck does not report on these files, that is expected and not a failure to chase.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-alerts/message.ts
git commit -m "feat: add the missed feed notification copy"
```

---

## Task 2: Recipients respect the missed-feed preference

**Files:**
- Modify: `supabase/functions/send-alerts/recipients.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `resolveRecipientTokens(client, alert)` where `alert` is now `{ household_id: string; kind: 'feed_logged' | 'missed_feed'; actor_id: string | null }`. Task 3 passes the whole alert row, which already has `kind`.

- [ ] **Step 1: Make the preference column a function of `kind`**

Today the query filters `.eq('feed_logged_alerts', true)` unconditionally. Left alone, a missed-feed alert would be silenced for everyone whose *feed-logged* toggle is off — and that column defaults to `false`, so most members would never get one.

Replace the signature and the query. The `actor_id` branch and the `push_tokens` lookup below it stay exactly as they are.

```ts
export const resolveRecipientTokens = async (
  client: SupabaseClient,
  alert: {
    household_id: string;
    kind: 'feed_logged' | 'missed_feed';
    actor_id: string | null;
  }
): Promise<string[]> => {
  const preferenceColumn =
    alert.kind === 'missed_feed' ? 'missed_feed_alerts' : 'feed_logged_alerts';

  let query = client
    .from('household_members')
    .select('user_id')
    .eq('household_id', alert.household_id)
    .eq(preferenceColumn, true);
```

- [ ] **Step 2: Extend the doc comment by two lines**

The existing block comment states the feed-logged delivery rule. Add the missed-feed rule to it and change nothing else:

```ts
 * A Missed Feed Alert goes to every member with Missed Feed Alerts on, with
 * nobody excluded -- there is no actor, because the point is that no one acted.
```

Do not restate the default values or explain them. That reasoning lives in the `alert_preferences` migration already.

- [ ] **Step 3: Verify by reading**

Confirm all four combinations resolve as intended:

| Alert kind | Member's `feed_logged_alerts` | Member's `missed_feed_alerts` | Receives? |
|---|---|---|---|
| `feed_logged` | true | false | yes (unless author) |
| `feed_logged` | false | true | no |
| `missed_feed` | false | true | yes |
| `missed_feed` | true | false | no |

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-alerts/recipients.ts
git commit -m "fix: pick the alert preference column from the alert kind"
```

---

## Task 3: Wire the Edge Function to both kinds

**Files:**
- Create: `supabase/functions/send-alerts/subjects.ts`
- Modify: `supabase/functions/send-alerts/index.ts`

**Interfaces:**
- Consumes: `buildFeedLoggedMessage`, `buildMissedFeedMessage`, `ExpoMessage`, `ScheduleLabel` from Task 1. `resolveRecipientTokens` from Task 2.
- Produces: `buildMessageForAlert(client, alert): Promise<Omit<ExpoMessage, 'to'> | null>` — `null` means the subject row is gone.

- [ ] **Step 1: Create `subjects.ts`**

This file exists so one place owns the fact that `alerts.subject_id` points at a `feed_logs.id` for one kind and a `feeding_schedules.id` for the other. `index.ts` should not have to know that.

The `feed_logged` branch is the block being moved out of `index.ts` — same selects, same `deno-lint-ignore`, and keep the existing `logged_by` comment verbatim. `.single()` becomes `.maybeSingle()` so a deleted subject returns `null` rather than an error.

Note how short the doc comment is. Do not expand it.

```ts
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  buildFeedLoggedMessage,
  buildMissedFeedMessage,
  type ExpoMessage,
  type ScheduleLabel
} from './message.ts';

type AlertSubject = {
  kind: 'feed_logged' | 'missed_feed';
  subject_id: string;
};

/**
 * subject_id is a feed_logs.id for feed_logged and a feeding_schedules.id for
 * missed_feed. Null means the row is gone -- deleted between queue and dispatch.
 */
export const buildMessageForAlert = async (
  client: SupabaseClient,
  alert: AlertSubject
): Promise<Omit<ExpoMessage, 'to'> | null> => {
  if (alert.kind === 'feed_logged') {
    const { data: log } = await client
      .from('feed_logs')
      .select('id, logged_at, notes, logged_by, pets ( name, households ( timezone ) )')
      .eq('id', alert.subject_id)
      .maybeSingle();

    if (!log) return null;

    // logged_by is nullable with on delete set null -- a log can outlive its
    // author, and buildFeedLoggedMessage renders that as "Member".
    const { data: author } = log.logged_by
      ? await client.from('users').select('first_name').eq('id', log.logged_by).maybeSingle()
      : { data: null };

    // deno-lint-ignore no-explicit-any
    const pet = (log as any).pets;

    return buildFeedLoggedMessage({
      authorFirstName: author?.first_name ?? null,
      petName: pet.name,
      loggedAt: log.logged_at,
      householdTimezone: pet.households.timezone,
      notes: log.notes,
      logId: log.id
    });
  }

  const { data: slot } = await client
    .from('feeding_schedules')
    .select('scheduled_time, label, pets ( name )')
    .eq('id', alert.subject_id)
    .maybeSingle();

  if (!slot) return null;

  // deno-lint-ignore no-explicit-any
  const pet = (slot as any).pets;

  return buildMissedFeedMessage({
    petName: pet.name,
    label: slot.label as ScheduleLabel,
    scheduledTime: slot.scheduled_time
  });
};
```

- [ ] **Step 2: Rewrite the middle of `index.ts`**

Change the imports at the top:

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';

import { sendExpoMessages } from './expo.ts';
import { type ExpoMessage } from './message.ts';
import { resolveRecipientTokens } from './recipients.ts';
import { buildMessageForAlert } from './subjects.ts';
```

Add `subject_date` to the alert select:

```ts
  const { data: alert, error: alertError } = await client
    .from('alerts')
    .select(
      'id, household_id, kind, subject_id, subject_date, actor_id, sent_at, suppressed_reason'
    )
    .eq('id', alertId)
    .single();
```

Then replace everything from the `if (alert.kind !== 'feed_logged')` line down to and including the `const message: ExpoMessage = {...}` block with:

```ts
  const content = await buildMessageForAlert(client, alert);

  // Stamped rather than left pending: this alert can never become sendable.
  if (!content) {
    await client
      .from('alerts')
      .update({ sent_at: new Date().toISOString(), error: 'subject not found' })
      .eq('id', alert.id);
    return new Response('Alert subject not found');
  }

  const tokens = await resolveRecipientTokens(client, alert);

  if (tokens.length === 0) {
    // Stamped as sent, because there is nothing left to do for this alert.
    // "no recipients" distinguishes a household of one, or a fully muted
    // household, from a delivery that broke.
    await client
      .from('alerts')
      .update({ sent_at: new Date().toISOString(), error: 'no recipients' })
      .eq('id', alert.id);
    return new Response('No recipients');
  }

  const message: ExpoMessage = { to: tokens, ...content };
```

Everything from `try {` onwards — tickets, `DeviceNotRegistered` pruning, stamping, the catch — is unchanged.

The two `keep`-worthy details: `if (alert.kind !== 'feed_logged') return new Response('Unsupported kind');` is deleted, and the feed-log and author fetches are gone because they moved to `subjects.ts`.

- [ ] **Step 3: Run the gates**

```bash
bun run typecheck
bun run lint
PATH="$HOME/.volta/tools/image/node/24.18.0/bin:$PATH" node node_modules/.bin/cspell --no-progress "**/*.{ts,tsx,md,sql}"
```

Expected: as Task 1 step 5.

- [ ] **Step 4: Deploy the function**

Deploy with the Supabase MCP `deploy_edge_function` tool, or:

```bash
bunx supabase functions deploy send-alerts --project-ref "$(grep EXPO_PUBLIC_SUPABASE_URL .env | sed -E 's|.*//([a-z]+)\..*|\1|')"
```

`verify_jwt` stays **false** — the caller is the database, authenticating on `x-alert-secret`. Do not change it.

- [ ] **Step 5: Verify the feed-logged path still works**

This task refactored the path that already worked. Confirm it before moving on.

Log a feed from the app on a device. Then:

```sql
select kind, sent_at, error, suppressed_reason
from public.alerts
order by created_at desc
limit 1;
```

Expected: `kind = 'feed_logged'`, `sent_at` populated. `error` is `'no recipients'` while the household still has one member — that is correct, not a failure. In a two-member household the push arrives.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-alerts/subjects.ts supabase/functions/send-alerts/index.ts
git commit -m "feat: dispatch missed feed alerts from send-alerts"
```

---

## Task 4: The sweep

**Files:**
- Create: `supabase/migrations/20260730090000_sweep_missed_feeds.sql`

**Interfaces:**
- Consumes: `private.slot_states(uuid, date, timestamptz default null)`, returning columns `schedule_id, scheduled_time, label, scheduled_at, state, satisfying_log_id, satisfied_at, satisfied_by, hypothetical_in_window`. Also the Edge Function work from Tasks 1–3, so anything this inserts can actually be delivered.
- Produces: `private.sweep_missed_feeds() returns integer` — the count of alerts inserted. Task 5 schedules it.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260730090000_sweep_missed_feeds.sql`:

```sql
-- Missed-feed detection. See ADR 0013 for why this is a sweep and not an Edge
-- Function, and CONTEXT.md for the Nudge Limit.
--
-- The lookback exists so the first run does not alert every slot every
-- household has ever missed. Its cost is that a sweep outage loses those
-- alerts, which is accepted: a nudge about breakfast is worthless by lunch.

create or replace function private.sweep_missed_feeds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  nudge_limit constant integer := 3;
  lookback constant interval := interval '30 minutes';
  inserted_total integer := 0;
  row_inserted integer;
  nudges integer;
  last_log_created_at timestamptz;
  local_date date;
  pet record;
  slot record;
begin
  for pet in
    select
      pets.id as pet_id,
      pets.household_id,
      households.timezone,
      make_interval(mins => households.grace_window_minutes) as grace
    from public.pets
    join public.households on households.id = pets.household_id
  loop
    -- created_at, not logged_at: the question is whether a human is still using
    -- the app, and someone backdating a log has just proved they are.
    select max(feed_logs.created_at) into last_log_created_at
    from public.feed_logs
    where feed_logs.pet_id = pet.pet_id;

    select count(*) into nudges
    from public.alerts
    join public.feeding_schedules on feeding_schedules.id = alerts.subject_id
    where alerts.kind = 'missed_feed'
      and feeding_schedules.pet_id = pet.pet_id
      and (last_log_created_at is null or alerts.created_at > last_log_created_at);

    if nudges >= nudge_limit then
      continue;
    end if;

    -- Yesterday too: a late-evening slot's window can close after local midnight.
    foreach local_date in array array[
      (now() at time zone pet.timezone)::date - 1,
      (now() at time zone pet.timezone)::date
    ]
    loop
      for slot in
        select states.schedule_id, states.scheduled_at
        from private.slot_states(pet.pet_id, local_date) as states
        where states.state = 'missed'
        order by states.scheduled_at asc
      loop
        if slot.scheduled_at + pet.grace < now() - lookback then
          continue;
        end if;

        -- on conflict is what makes the 15-minute cadence safe.
        insert into public.alerts (household_id, kind, subject_id, subject_date)
        values (pet.household_id, 'missed_feed', slot.schedule_id, local_date)
        on conflict (kind, subject_id, subject_date) do nothing;

        get diagnostics row_inserted = row_count;

        if row_inserted = 1 then
          nudges := nudges + 1;
          inserted_total := inserted_total + 1;

          -- Counted as we insert, so a pet at 2 cannot land at 5 in one run.
          exit when nudges >= nudge_limit;
        end if;
      end loop;

      exit when nudges >= nudge_limit;
    end loop;
  end loop;

  return inserted_total;
end $$;

-- Born with PUBLIC EXECUTE, and never granted to authenticated: no client calls this.
revoke execute on function private.sweep_missed_feeds() from public;
revoke execute on function private.sweep_missed_feeds() from anon, authenticated;
```

- [ ] **Step 2: Apply it**

Apply with the Supabase MCP `apply_migration` tool, name `20260730090000_sweep_missed_feeds`.

- [ ] **Step 3: Verify it is inert when nothing is missed**

```sql
select private.sweep_missed_feeds();
```

Expected: `0`, assuming no slot's window closed in the last 30 minutes. Run it twice — still `0`.

If it returns non-zero on the first ever call, that is not necessarily wrong: check whether a real slot genuinely just went missed.

```sql
select id, kind, subject_id, subject_date, created_at
from public.alerts
where kind = 'missed_feed'
order by created_at desc;
```

- [ ] **Step 4: Verify it detects a missed slot**

This writes to live data. **Note the values you change — step 5 reverts them.**

Pick a pet and move one of its Scheduled Times so its Grace Window has just closed. With the default 60-minute window, a slot 70 minutes ago qualifies and is comfortably inside the 30-minute lookback.

```sql
-- Record these. Later steps need the schedule id, the pet id, the household id
-- and the original scheduled_time.
select
  fs.id as schedule_id,
  fs.scheduled_time,
  fs.label,
  p.id as pet_id,
  p.name as pet_name,
  h.id as household_id,
  h.timezone,
  h.grace_window_minutes
from public.feeding_schedules fs
join public.pets p on p.id = fs.pet_id
join public.households h on h.id = p.household_id
order by fs.scheduled_time;
```

```sql
-- Move ONE slot to 70 minutes ago in the household's local wall clock.
update public.feeding_schedules
set scheduled_time = ((now() at time zone (
      select h.timezone from public.households h
      join public.pets p on p.household_id = h.id
      where p.id = public.feeding_schedules.pet_id
    )) - interval '70 minutes')::time
where id = '<the schedule id you chose>';
```

Confirm the slot now reads as missed, and that no feed log covers it:

```sql
select schedule_id, scheduled_time, state
from private.slot_states('<pet id>', (now() at time zone '<household timezone>')::date);
```

Expected: the slot you moved shows `state = 'missed'`.

Now sweep:

```sql
select private.sweep_missed_feeds();
```

Expected: `1`.

```sql
select kind, subject_id, subject_date, actor_id, sent_at, error, suppressed_reason
from public.alerts
where kind = 'missed_feed'
order by created_at desc
limit 1;
```

Expected: `kind = 'missed_feed'`, `subject_id` = your schedule id, `subject_date` = today's local date, `actor_id` null, `suppressed_reason` null. `sent_at` populated once `send-alerts` has run.

- [ ] **Step 5: Verify idempotency, then the lookback**

```sql
select private.sweep_missed_feeds();
```

Expected: `0`. The row already exists and `on conflict do nothing` swallowed it. This is the check that the every-15-minutes cadence is safe.

Now push the slot outside the lookback — 2 hours ago, so its window closed 60 minutes ago:

```sql
update public.feeding_schedules
set scheduled_time = ((now() at time zone (
      select h.timezone from public.households h
      join public.pets p on p.household_id = h.id
      where p.id = public.feeding_schedules.pet_id
    )) - interval '2 hours')::time
where id = '<the same schedule id>';
```

```sql
delete from public.alerts where kind = 'missed_feed' and subject_id = '<schedule id>';
select private.sweep_missed_feeds();
```

Expected: `0`. The slot is still `missed`, but its window closed too long ago.

**Revert the schedule now:**

```sql
update public.feeding_schedules
set scheduled_time = '<the original value you wrote down>'
where id = '<schedule id>';
```

- [ ] **Step 6: Verify the Nudge Limit, and check the push on a device**

Move the slot back to 70 minutes ago (the step 4 statement). Then, to reach the limit quickly, insert two older missed-feed alerts by hand for the same pet, on dates that will not collide with the real one:

```sql
insert into public.alerts (household_id, kind, subject_id, subject_date, suppressed_reason)
values
  ('<household id>', 'missed_feed', '<schedule id>', current_date - 1, 'nudge limit test'),
  ('<household id>', 'missed_feed', '<schedule id>', current_date - 2, 'nudge limit test');
```

`suppressed_reason` is set so `dispatch_alert` returns early and these test rows send nothing.

```sql
select private.sweep_missed_feeds();
```

Expected: `1` — two prior nudges plus this one reaches the limit. Sweep again: `0`.

Now add a third prior nudge and confirm the pet goes quiet:

```sql
insert into public.alerts (household_id, kind, subject_id, subject_date, suppressed_reason)
values ('<household id>', 'missed_feed', '<schedule id>', current_date - 3, 'nudge limit test');

delete from public.alerts
where kind = 'missed_feed' and subject_date = current_date and subject_id = '<schedule id>';

select private.sweep_missed_feeds();
```

Expected: `0`. Three prior nudges, no feed log since.

Confirm a feed log resets it. Log a feed from the app (which sets `created_at = now()`), then:

```sql
select private.sweep_missed_feeds();
```

Expected: `1`. Every prior nudge predates the new log, so the count is 0 again.

**On a real device**, confirm the push that arrives reads:

> **No one has logged Bailey's morning feed**
> Due 7:00 am

and that tapping it lands on the Home tab. Simulators do not receive APNs — PRODUCT_BRIEF flags this specifically.

Also confirm muting silences the push but keeps the record. Turn Missed Feed Alerts off on the notifications screen, delete today's row, sweep again:

```sql
select kind, sent_at, error from public.alerts
where kind = 'missed_feed' order by created_at desc limit 1;
```

Expected: the row exists, `sent_at` populated, `error = 'no recipients'`. Turn the toggle back on.

- [ ] **Step 7: Clean up the test data**

```sql
delete from public.alerts where suppressed_reason = 'nudge limit test';

update public.feeding_schedules
set scheduled_time = '<the original value>'
where id = '<schedule id>';
```

Then confirm the schedule matches what you wrote down in step 4, and that the app's Home screen shows the slots you expect.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260730090000_sweep_missed_feeds.sql
git commit -m "feat: add the missed feed sweep"
```

---

## Task 5: Schedule the sweep

**Files:**
- Create: `supabase/migrations/20260730090100_schedule_missed_feed_sweep.sql`

**Interfaces:**
- Consumes: `private.sweep_missed_feeds()` from Task 4.
- Produces: a `cron.job` row named `sweep-missed-feeds`.

- [ ] **Step 1: Write the migration**

`pg_cron` is available on this project at 1.6.4 and is **not yet installed**. It creates its own `cron` schema and runs jobs in the `postgres` database, which is where these tables live.

Create `supabase/migrations/20260730090100_schedule_missed_feed_sweep.sql`:

```sql
-- The 15-minute cadence bounds alert latency; the sweep's 30-minute lookback is
-- two intervals wide so one skipped run still catches up.

create extension if not exists pg_cron;

-- Unschedule first so this stays re-runnable against a hand-created job.
select cron.unschedule('sweep-missed-feeds')
where exists (select 1 from cron.job where jobname = 'sweep-missed-feeds');

select cron.schedule(
  'sweep-missed-feeds',
  '*/15 * * * *',
  $$select private.sweep_missed_feeds()$$
);
```

If `create extension` fails on permissions, enable **pg_cron** from the Supabase dashboard under Database → Extensions, then apply the migration again.

- [ ] **Step 2: Apply it**

Apply with the Supabase MCP `apply_migration` tool, name `20260730090100_schedule_missed_feed_sweep`.

- [ ] **Step 3: Verify the job exists**

```sql
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'sweep-missed-feeds';
```

Expected: one row, `schedule = '*/15 * * * *'`, `active = true`.

- [ ] **Step 4: Verify it actually runs**

Wait for the next quarter hour, then:

```sql
select status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'sweep-missed-feeds')
order by start_time desc
limit 5;
```

Expected: at least one row with `status = 'succeeded'`. `return_message` reads `SELECT 1`.

If `status = 'failed'`, `return_message` holds the error — that is the decisive line to read, and it is the whole reason the sweep raises rather than swallowing per-pet failures.

- [ ] **Step 5: Verify end to end, unattended**

Move a Scheduled Time to 70 minutes ago as in Task 4 step 4. Do **not** call the sweep by hand. Wait for the next quarter hour.

Expected: the push arrives on the device with no manual trigger, and a `missed_feed` row appears with `sent_at` populated.

Revert the Scheduled Time afterwards.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260730090100_schedule_missed_feed_sweep.sql
git commit -m "feat: schedule the missed feed sweep every 15 minutes"
```

---

## Task 6: Documentation

**Files:**
- Create: `docs/adr/0013-missed-feed-detection-is-a-database-sweep.md`
- Modify: `CONTEXT.md`

**Interfaces:** none.

- [ ] **Step 1: Write ADR 0013**

Match the house style: `status: accepted` frontmatter, a title that states the decision, `## Considered options`, `## Consequences`.

```markdown
---
status: accepted
---

# Missed-feed detection is a database sweep, not a scheduled Edge Function

A `pg_cron` job runs `private.sweep_missed_feeds()` every 15 minutes. It calls
`private.slot_states` per pet and inserts an `alerts` row for each slot that
came back `missed`. The existing `alerts_dispatch` trigger and the `send-alerts`
Edge Function deliver it, unchanged.

This retires the mechanism half of [ADR 0002](./0002-missed-feed-alert-engine.md).
Everything else in 0002 stands: timezone on the Household, a per-household
Grace Window, "any feed in the window" matching, and keying off `logged_at`.

## Considered options

- **A scheduled Edge Function**, as ADR 0002 described — rejected. That ADR
  predates the outbox. [ADR 0012](./0012-recipient-controlled-alert-delivery-and-the-outbox.md)
  split queueing an alert from delivering one, and detection is queueing: every
  other path that queues an alert is already a database trigger. An Edge
  Function sweep would give us two places that insert `alerts` rows, in two
  languages, and the new one would be the awkward one — its whole body a loop
  calling a SQL function, because [ADR 0009](./0009-symmetric-grace-window-derived-slot-matching.md)
  puts all Grace Window arithmetic in `private.slot_states` and forbids
  reimplementing it in TypeScript. One network round trip per pet, to reach
  code already reachable for free.
- **pg_cron calling an Edge Function that then detects** — rejected. Two
  scheduled systems, a network hop between them, and a shared secret to manage,
  all to arrive at logic that lives in SQL anyway.
- **A database sweep** (chosen).

## Consequences

- **Idempotency comes for free.** `alerts_idempotency_idx` is already unique on
  `(kind, subject_id, subject_date)`, so the insert is `on conflict do nothing`
  and a double run is harmless by construction rather than by care. That index
  was added in the outbox migration for this sweep specifically.
- **A sweep outage loses those alerts permanently**, because the sweep only
  considers slots whose Grace Window closed in the last 30 minutes. Accepted: a
  missed-feed alert is only useful while you can still act on it, so the
  alternative is delivering noise.
- **The sweep is `security definer` owned by `postgres`** and is not granted to
  `authenticated`. `private.slot_states` is `security invoker`, so it runs as
  the sweep's owner — which is what lets one call see every household.
- **Detection latency is bounded by the cadence.** A slot whose window closes at
  08:00 is nudged between 08:00 and 08:15.
- **Debugging moves to `cron.job_run_details`** rather than Edge Function logs.
```

- [ ] **Step 2: Sharpen `Missed Feed Alert` in `CONTEXT.md`**

The entry currently reads:

```markdown
**Missed Feed Alert**:
The push to all household members when a Missed Feed is detected server-side.
```

Replace with:

```markdown
**Missed Feed Alert**:
The push to all household members when a Missed Feed is detected server-side,
unless that Member has turned Missed Feed Alerts off. Nobody is excluded — there
is no actor, because the point is that no one acted.
The copy names the absent **log**, never the absent meal: "No one has logged
Bailey's morning feed", not "Bailey hasn't been fed". The app only ever knows
that nobody tapped Log, and most of the time the pet was fed — claiming
otherwise is the trust failure PRODUCT_BRIEF calls fatal.
```

- [ ] **Step 3: Add `Nudge Limit` to `CONTEXT.md`**

Insert into the Notifications section, after `Missed Feed Alert`:

```markdown
**Nudge Limit**:
After 3 consecutive Missed Feed Alerts for a pet with no Feed Log in between,
Missed Feed Alerts stop for that pet until someone logs a feed. Stops a
household that set up a schedule and drifted away from being nudged three times
a day forever. Counted per pet, so one dormant pet never silences another.
_Avoid_: Snooze, cooldown, rate limit.
```

- [ ] **Step 4: Run spellcheck**

```bash
PATH="$HOME/.volta/tools/image/node/24.18.0/bin:$PATH" node node_modules/.bin/cspell --no-progress "**/*.{ts,tsx,md,sql}"
```

Expected: 0 issues. If a new word trips it, add it to `words` in `cspell.json` in the right alphabetical position — do not add an inline disable.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0013-missed-feed-detection-is-a-database-sweep.md CONTEXT.md
git commit -m "docs: record the missed feed sweep decision and its glossary terms"
```

---

## Out of Scope

Carried from the spec, restated so nobody drifts into them:

- **Grouping alerts across pets.** A three-pet household gets three pushes. Named copy is the actionable copy, and grouping would need a different `subject_id` and a different uniqueness rule. Revisit with the multi-pet UI, which is v2 and paywalled.
- **Notification preferences during onboarding.** Deferred. Asking someone to configure notifications before they have used the app asks a question they cannot answer. Revisit when the full set of notification types exists, and consider disclosure rather than configuration.
- **Retrying pending alerts.** `alerts_pending_idx` exists for a future sweep; nothing reads it yet.
- **In-app notification history.** Needs a select policy on `alerts` plus an `alert_reads` table.
- **Per-schedule grace windows.** A paywall candidate in PRODUCT_BRIEF.
- **A test runner.** `pgtap` is available on this project and would suit the sweep well — the Nudge Limit and lookback are exactly the logic worth pinning down. Setting it up is its own ticket, and AGENTS.md says the runner comes first and gets documented. Do not bundle it here.
