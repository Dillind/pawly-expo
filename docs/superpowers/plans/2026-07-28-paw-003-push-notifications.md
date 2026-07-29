# PAW-003 Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Status — 2026-07-29

**The checkboxes below were never maintained; they are all unticked and none of them
mean anything. Read this block instead.**

- **Tasks 1–13: done and committed.** The server chain is verified against the live
  database by SQL assertion: `log_feed` → `feed_logs` → queue trigger → `alerts` →
  dispatch trigger → `pg_net`. The UI (Tasks 10–12) is written and passes
  typecheck/lint/spellcheck but **has never run on a device**.
- **Task 14 (end-to-end verification): not started, and it is the only thing left.**

Remaining blockers, all needing a human:

1. ~~`eas init`~~ — **done.** Project `3bd7aa83-b1be-43b3-97c2-a3b7d2a7f51c`, slug `crumpet`.
2. **Dev client build** — `bunx eas build --profile development --platform ios`.
   Prompts for Apple credentials. `eas.json` is already correct.
3. **Vault secrets + `ALERT_DISPATCH_SECRET`** — not created. The two values must match
   exactly or every dispatch 401s. Commands in Task 6 Step 1.
4. **A second household member** — a service-role insert, since `household_members` is
   founding-owner-only by RLS. **Must set `feed_logged_alerts = true` in the same
   insert**; the column defaults to `false`, and omitting it produces a silent failure
   indistinguishable from broken APNs. See Task 14 Step 1.

Corrections to this document, already applied in the real migration but **not** fixed in
the prose below — do not reintroduce them if you regenerate anything from here:

- The dispatch trigger calls **`net.http_post`**, not `extensions.net.http_post`.
- The app was renamed **Pawly → Crumpet** after this plan was written. Identifiers here
  are current, but the ticket prefix moved to `CRU-` from 004 onward; this ticket stays
  `PAW-003`.

**Goal:** When a household member logs a feed, every other member who wants to know receives a push notification that opens the correction sheet for that log.

**Architecture:** An outbox. `log_feed` inserts a `feed_logs` row; an after-insert trigger queues one `alerts` row per *event*; a second trigger calls the `send-alerts` Edge Function via `pg_net`. The function resolves recipients at send time (household members, minus the author, filtered by preference), collects their `push_tokens`, and posts to Expo. Recipients are resolved at send time rather than fan-out at queue time, so a preference changed between queue and delivery is respected.

**Tech Stack:** Expo SDK 57, `expo-notifications`, Supabase (Postgres, RLS, Edge Functions on Deno, `pg_net`, Vault), TanStack Query, Zustand, TrueSheet.

**Source spec:** `docs/superpowers/specs/2026-07-26-double-feed-guard-and-push-notifications-design.md` — **Part 2 only**. Part 1 shipped as PAW-002.

**Decisions made after the spec was written** (this plan overrides the spec where they conflict):

1. One EAS project, not two. All four `isProd` ternaries in `app.config.ts` collapse.
2. Bundle identifiers are `au.com.crumpet.ios` and `au.com.crumpet.android`.
3. Preference column defaults are quiet: `feed_logged_alerts default false`, `missed_feed_alerts default true`. `create_household_and_pet` writes the founding owner's `true` explicitly.
4. **Only the Feed Logged toggle ships.** `missed_feed_alerts` ships as a column, unexposed. The spec's "both toggles, live" is superseded — a toggle for an alert that cannot fire is the app lying about its own state.
5. No master "All notifications" switch this pass. It arrives with the second category, as a real stored column checked server-side.
6. No per-log "notify?" toggle. Replaced by **30-minute backdating suppression** in the trigger.
7. Suppressed alerts are **written**, not skipped, with a `suppressed_reason` column.
8. Tab roots keep their `AppText` header and no native header. Pushed screens get the native header and its automatic back arrow.

---

## Global Constraints

- **Expo SDK 57.** Read `https://docs.expo.dev/versions/v57.0.0/` before touching any Expo API. `package.json` is the source of truth for versions.
- **There is no test runner in this repo.** No `test` script, no Jest, no Vitest. **Do not invent one, and do not write test files.** The TDD cycle this plan uses is: write the assertion as a runnable SQL query or a typecheck, run it, see it fail, implement, run it again. Every task states its exact verification command.
- **Verification commands:** `bun run typecheck`, `bun run lint`, `bun run spellcheck`. All three must pass before any commit.
- **SQL assertions** run through the Supabase MCP tool `execute_sql`. Migrations apply through `apply_migration`.
- **Migrations are named** `supabase/migrations/YYYYMMDDHHMMSS_snake_case_description.sql`. This pass uses the `20260728…` prefix. Never edit an applied migration — add a new one.
- **Every SQL function** is `set search_path = ''` and fully schema-qualifies every reference. Follow `20260726090100_log_feed_rpc.sql`.
- **Australian/British English** in all user-facing copy (colour, organise, cancelled, "tick" not "check").
- **Prettier:** 100-char width, single quotes, **no trailing commas**, `bracketSameLine: true`.
- **Files and folders are `kebab-case`.** Path aliases: `@/*` → `src/*`.
- **Icons only via `@/components/core/icon`**, keys registered in `src/constants/icon-map.ts`. Never import from `lucide-react-native` outside that map.
- **Sheets always build on `BaseSheet`** (`src/components/bottom-sheets/base-sheet.tsx`). Import `TrueSheet` as a **type only** everywhere else.
- **Zustand stores** split `State` and `Action` types, consumed with a plain destructure, never a per-field selector.
- **Colours via `useTheme()`**, styles via a module-level `makeStyles` + `useStyles(makeStyles)`. Never hard-code a colour string.
- **Before writing any UI code** (Tasks 9, 10, 11) invoke `/frontend-design` and `/expo-native-ui`. This is an AGENTS.md requirement, not a suggestion.
- **On-device claims are measured** via argent's `describe`, never asserted from a screenshot.

---

## File Structure

**Created — database**
- `supabase/migrations/20260728090000_push_tokens.sql` — the `push_tokens` table, its RLS, its grants.
- `supabase/migrations/20260728090100_alert_preferences.sql` — the two preference columns on `household_members`, plus the `create_household_and_pet` change.
- `supabase/migrations/20260728090200_alerts.sql` — `alert_kind` enum, `alerts` table, idempotency constraint, RLS.
- `supabase/migrations/20260728090300_queue_feed_logged_alert.sql` — the after-insert trigger on `feed_logs`, including 30-minute suppression.
- `supabase/migrations/20260728090400_dispatch_alerts.sql` — `pg_net`, the Vault secret read, the after-insert trigger on `alerts`.

**Created — Edge Function**
- `supabase/functions/send-alerts/index.ts` — the HTTP entry point, shared-secret auth.
- `supabase/functions/send-alerts/recipients.ts` — resolve recipients and tokens for an alert.
- `supabase/functions/send-alerts/message.ts` — build the Expo message body. Pure, no I/O.
- `supabase/functions/send-alerts/expo.ts` — batching and the POST to Expo; ticket handling.

Split this way because `message.ts` is the only part with interesting logic and no I/O — it is the piece worth reasoning about in isolation, and the piece a future `missed_feed` kind will extend.

**Created — client**
- `src/services/push-token.service.ts` — register and delete a push token. Mirrors `src/services/auth.service.ts`.
- `src/hooks/use-notification-preferences.ts` — TanStack Query read + mutation for the two preference columns.
- `src/components/bottom-sheets/notification-priming-sheet.tsx` — the first-run prompt.
- `src/app/(protected)/(tabs)/profile/notifications.tsx` — the Manage Notifications screen. **The first pushed route in the app.**
- `src/components/screens/profile/notification-settings.tsx` — the section body, so the route file stays thin.

**Modified**
- `app.config.ts` — collapse the ternaries, real `projectId`.
- `eas.json` — created; does not exist today.
- `src/hooks/use-push-notifications.ts` — rewritten.
- `src/app/_layout.tsx:19-36` — mount the hook inside `AuthGate`.
- `src/app/(protected)/(tabs)/profile/_layout.tsx` — per-screen headers.
- `src/app/(protected)/(tabs)/profile/index.tsx` — a row into `notifications`.
- `src/components/core/toggle-switch.tsx` — add `isDisabled`.
- `src/components/bottom-sheets/log-feed-sheet.tsx` — the "who will be notified" line.
- `src/services/auth.service.ts` — delete the token on sign-out.
- `src/constants/icon-map.ts` — a `bell` key.
- `CONTEXT.md`, `AGENTS.md`, `docs/adr/0012-*.md`.

---

## Task 1: Collapse the environment split and initialise EAS

No push token can be issued until `projectId` is a real value — `app.config.ts:85` is `isProd ? '' : ''`, so `getExpoPushTokenAsync` throws today. This task is a prerequisite for every client task and touches no application code.

**Files:**
- Modify: `app.config.ts:8-11, 25, 32, 85`
- Create: `eas.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `Constants.expoConfig.extra.eas.projectId` as a non-empty string, read by Task 7.

- [ ] **Step 1: Confirm the failure before changing anything**

Run: `bunx expo config --type public | grep -A3 '"eas"'`

Expected: `projectId` present but **empty**. This is the failure this task fixes.

- [ ] **Step 2: Collapse the ternaries in `app.config.ts`**

Replace lines 8–11 with:

```ts
const APP_ENV = process.env.EXPO_PUBLIC_NODE_ENV || 'development';
const isProd = APP_ENV === 'production';
```

`appName` and `appSlug` are deleted. Then in the returned object:

```ts
name: 'Crumpet',
slug: 'crumpet',
```

```ts
bundleIdentifier: 'au.com.crumpet.ios',
```

```ts
package: 'au.com.crumpet.android',
```

Leave `isProd` declared — Task 12 is free to use it for a future prod-only concern, and removing it now would be churn. If `bun run lint` reports it unused, delete the two lines and the `APP_ENV` line with it.

> **Why one project:** `slug` *is* the EAS project identity. Two slugs means two projects, two APNs keys, and push tokens scoped to whichever project issued them — which would force a `project_id` column onto `push_tokens`. The split was never real anyway: `.env` has a single `EXPO_PUBLIC_SUPABASE_URL`, so a "production" build talked to the same database as dev.

- [ ] **Step 3: Ask the user to run `eas init`**

This needs an interactive Expo login and **must not** be run by an agent. Tell the user:

> Run `! bunx eas init` and paste me the project id.

Wait for the id. Do not proceed on a guess.

- [ ] **Step 4: Write the project id into `app.config.ts`**

```ts
extra: {
  eas: {
    projectId: '<the id from step 3>'
  }
}
```

- [ ] **Step 5: Verify the config resolves**

Run: `bunx expo config --type public | grep -A3 '"eas"'`

Expected: `projectId` is the non-empty id from step 3, and `slug` is `crumpet`.

- [ ] **Step 6: Create `eas.json`**

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

`"ios": { "simulator": true }` on `development` is the load-bearing line: it produces a simulator-compatible dev client, and push works on the iOS Simulator from Xcode 14 / iOS 16 upward, so no physical device is needed.

- [ ] **Step 7: Ask the user to build the dev client**

Again interactive — credentials generation prompts for the Apple account. Tell the user:

> Run `! bunx eas build --profile development --platform ios`, then install the resulting build on the simulator.

This is the step that generates the APNs key against `au.com.crumpet.ios`, which is why Step 2 had to fix the identifier first.

- [ ] **Step 8: Verify and commit**

Run: `bun run typecheck && bun run lint && bun run spellcheck`
Expected: all three pass.

```bash
git add app.config.ts eas.json
git commit -m "chore: collapse to one EAS project and add build profiles"
```

---

## Task 2: `push_tokens`

**Files:**
- Create: `supabase/migrations/20260728090000_push_tokens.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `public.push_tokens (token text pk, user_id uuid, platform text, created_at timestamptz, last_seen_at timestamptz)`. Read by Task 6 with the service role, written by Task 7.

- [ ] **Step 1: Write the assertion and watch it fail**

Run via `execute_sql`:

```sql
select to_regclass('public.push_tokens') is not null as exists;
```

Expected: `exists = false`.

- [ ] **Step 2: Write the migration**

```sql
-- The Expo push token is the primary key rather than a surrogate id because
-- the token IS the natural key. That makes registration a single upsert, and
-- the conflict clause handles the case that actually bites in development:
-- two accounts on one phone. Sign out, sign in as your partner to test the
-- feature, and the same token is reassigned rather than left as a stale row
-- pushing one person's household alerts into another person's session.
--
-- A single expo_push_token column on users (what Supabase's own guide does)
-- was rejected: it caps you at one device per account and breaks the moment
-- you sign into a second simulator to test the feature you are building.

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- No SELECT policy, deliberately. No user ever needs to read a push token,
-- including their own. The Edge Function reads with the service role, which
-- bypasses RLS. A member may only manage rows that are theirs.

create policy "Users can register their own push token"
on public.push_tokens for insert
to authenticated
with check ( user_id = (select auth.uid()) );

create policy "Users can refresh their own push token"
on public.push_tokens for update
to authenticated
using ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy "Users can delete their own push token"
on public.push_tokens for delete
to authenticated
using ( user_id = (select auth.uid()) );

revoke all on public.push_tokens from anon, authenticated;
grant insert, update, delete on public.push_tokens to authenticated;
```

> `grant` omits `select` to match the missing select policy — belt and braces, and it makes the intent legible without reading the policies.
>
> `(select auth.uid())` rather than bare `auth.uid()` is the documented Supabase RLS performance pattern: it lets the planner evaluate the function once per statement instead of once per row.

- [ ] **Step 3: Apply it**

Apply via `apply_migration` with name `push_tokens`.

- [ ] **Step 4: Re-run the assertion**

```sql
select to_regclass('public.push_tokens') is not null as exists;
```

Expected: `exists = true`.

Then confirm the token is genuinely the primary key:

```sql
select a.attname
from pg_index i
join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
where i.indrelid = 'public.push_tokens'::regclass and i.indisprimary;
```

Expected: exactly one row, `token`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260728090000_push_tokens.sql
git commit -m "feat: add push_tokens with token as the natural key"
```

---

## Task 3: Notification preference columns

**Files:**
- Create: `supabase/migrations/20260728090100_alert_preferences.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `household_members.feed_logged_alerts boolean` and `household_members.missed_feed_alerts boolean`. Read by Task 6, read/written by Task 10.

- [ ] **Step 1: Write the assertion and watch it fail**

```sql
select count(*) as cols
from information_schema.columns
where table_schema = 'public' and table_name = 'household_members'
  and column_name in ('feed_logged_alerts', 'missed_feed_alerts');
```

Expected: `cols = 0`.

- [ ] **Step 2: Read the function you are about to change**

Read `supabase/migrations/20260723090000_pet_household_onboarding.sql` lines 180–200. You need the exact current body of `create_household_and_pet` — this task rewrites one `insert` inside it, and the function must be recreated in full.

- [ ] **Step 3: Write the migration**

```sql
-- Preferences live on the membership, not on users, because the preference is
-- genuinely a property of THIS PERSON IN THIS HOUSEHOLD: a dog walker with
-- four clients can mute Tuesday's household and keep her own dog's alerts. It
-- also sits on the exact row the send query already joins to find recipients.
--
-- The column DEFAULTS are the QUIET ones. That is deliberate and it is not the
-- same as the role defaults. A column default is what every future path
-- inherits -- the invite-accept path that does not exist yet, a hand-seeded
-- test row, a backfill. A path someone forgets to update should be silent
-- (recoverable with a toggle the user already has) rather than noisy (the
-- failure PRODUCT_BRIEF names as fatal). The founding owner's `true` is
-- therefore stated explicitly below, by the one caller that knows the role.

alter table public.household_members
  add column feed_logged_alerts boolean not null default false,
  add column missed_feed_alerts boolean not null default true;

-- The single existing member is the founding owner of the dev household and
-- predates these columns. Without this they would sit at the quiet default and
-- the first end-to-end verification would silently deliver nothing.
update public.household_members set feed_logged_alerts = true where role = 'owner';
```

Then recreate `create_household_and_pet` verbatim from Step 2, changing **only** this insert:

```sql
  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');
```

to:

```sql
  -- Explicit rather than relying on the column default: this caller is the one
  -- place that knows it is inserting an owner, and Feed Logged Alerts default
  -- on for owners per the delivery rule in ADR 0012.
  insert into public.household_members (household_id, user_id, role, feed_logged_alerts)
  values (new_household_id, auth.uid(), 'owner', true);
```

Change nothing else in the function body. Keep its `security definer`/`security invoker` setting, its `set search_path = ''`, and its full signature exactly as they are.

- [ ] **Step 4: Apply and re-run the assertion**

Apply via `apply_migration` with name `alert_preferences`.

```sql
select count(*) as cols
from information_schema.columns
where table_schema = 'public' and table_name = 'household_members'
  and column_name in ('feed_logged_alerts', 'missed_feed_alerts');
```

Expected: `cols = 2`.

- [ ] **Step 5: Assert the defaults are the quiet ones**

```sql
select column_name, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'household_members'
  and column_name in ('feed_logged_alerts', 'missed_feed_alerts')
order by column_name;
```

Expected: `feed_logged_alerts` → `false`, `missed_feed_alerts` → `true`.

- [ ] **Step 6: Regenerate types**

Run the Supabase MCP `generate_typescript_types` tool and write the result to `src/types/database.types.ts`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260728090100_alert_preferences.sql src/types/database.types.ts
git commit -m "feat: add notification preferences to household_members"
```

---

## Task 4: `alerts`

**Files:**
- Create: `supabase/migrations/20260728090200_alerts.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `public.alert_kind` enum (`feed_logged` | `missed_feed`) and `public.alerts`. Written by Task 5, read and stamped by Task 6.

- [ ] **Step 1: Write the assertion and watch it fail**

```sql
select to_regtype('public.alert_kind') is not null as enum_exists,
       to_regclass('public.alerts') is not null as table_exists;
```

Expected: both `false`.

- [ ] **Step 2: Write the migration**

```sql
-- One row per EVENT, not per recipient. Recipients are resolved at send time,
-- so a preference changed between queue and delivery is respected.
--
-- Why an outbox rather than a trigger calling the Edge Function directly: the
-- missed-feed cron (ADR 0002) runs every 15 minutes, and a slot missed at
-- 08:00 is still missed at 08:15, 08:30 and every run after. Without a durable
-- record of "already alerted for this slot on this date" that engine pushes
-- "Bailey hasn't been fed" to the whole household four times an hour -- the
-- exact failure PRODUCT_BRIEF calls fatal, delivered by the feature meant to
-- prevent it. The engine needs a sent-record regardless, so building it now
-- costs nothing extra and avoids two delivery paths.

create type public.alert_kind as enum ('feed_logged', 'missed_feed');

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind public.alert_kind not null,
  subject_id uuid not null,
  subject_date date,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  suppressed_reason text
);

-- The idempotency key that makes the missed-feed cron safe to run every 15
-- minutes. Postgres treats nulls as DISTINCT in a unique constraint, so the
-- feed_logged half (subject_date null) relies on subject_id being a fresh
-- feed_logs.id each time -- which it is. The missed_feed half, where the
-- guarantee actually matters, has a non-null subject_date.
create unique index alerts_idempotency_idx
  on public.alerts (kind, subject_id, subject_date);

-- The Edge Function's work queue: rows queued, not yet sent, not suppressed.
create index alerts_pending_idx on public.alerts (created_at)
  where sent_at is null and suppressed_reason is null;

alter table public.alerts enable row level security;

-- No policy for `authenticated` in this pass, deliberately. Nothing in the app
-- reads alerts yet; the Edge Function reads with the service role. A future
-- in-app notification history (roadmap) adds a select policy scoped to
-- household membership plus a sparse alert_reads (alert_id, user_id, read_at)
-- table -- read state is separate because this table is one row per event, not
-- per recipient.
--
-- Muting silences the push, not the record. Someone with Feed Logged Alerts
-- off still has the rows; they have asked not to be interrupted, not to be
-- kept in the dark.

revoke all on public.alerts from anon, authenticated;
```

> `suppressed_reason` is a distinct column rather than reusing `error` because a suppressed alert is **not a failure**. During verification, "the alert was deliberately not sent" and "delivery broke" look identical from outside the database — this column is what tells them apart with one query, and it is the difference an in-app history would need to render.

- [ ] **Step 3: Apply and re-run the assertion**

Apply via `apply_migration` with name `alerts`.

```sql
select to_regtype('public.alert_kind') is not null as enum_exists,
       to_regclass('public.alerts') is not null as table_exists;
```

Expected: both `true`.

- [ ] **Step 4: Prove the idempotency key actually blocks a duplicate missed_feed**

This is the constraint's entire reason for existing, so assert it rather than trusting it. Run:

```sql
do $$
declare
  hid uuid;
  sid uuid := gen_random_uuid();
begin
  select id into hid from public.households limit 1;

  insert into public.alerts (household_id, kind, subject_id, subject_date)
  values (hid, 'missed_feed', sid, '2026-07-28');

  begin
    insert into public.alerts (household_id, kind, subject_id, subject_date)
    values (hid, 'missed_feed', sid, '2026-07-28');
    raise exception 'FAIL: duplicate missed_feed was accepted';
  exception when unique_violation then
    raise notice 'PASS: duplicate missed_feed rejected';
  end;

  delete from public.alerts where subject_id = sid;
end $$;
```

Expected: notice `PASS: duplicate missed_feed rejected`, and no rows left behind.

- [ ] **Step 5: Regenerate types and commit**

Run `generate_typescript_types`, write to `src/types/database.types.ts`.

```bash
git add supabase/migrations/20260728090200_alerts.sql src/types/database.types.ts
git commit -m "feat: add the alerts outbox and its idempotency key"
```

---

## Task 5: Queue a Feed Logged Alert, with backdating suppression

**Files:**
- Create: `supabase/migrations/20260728090300_queue_feed_logged_alert.sql`

**Interfaces:**
- Consumes: `public.alerts` (Task 4).
- Produces: trigger `feed_logs_queue_alert` on `public.feed_logs`. Every accepted feed log now yields exactly one `alerts` row.

- [ ] **Step 1: Write the assertion and watch it fail**

```sql
select count(*) as triggers from pg_trigger
where tgrelid = 'public.feed_logs'::regclass and tgname = 'feed_logs_queue_alert';
```

Expected: `triggers = 0`.

- [ ] **Step 2: Write the migration**

```sql
-- Queue one alert per feed log. This runs inside log_feed's transaction, so a
-- rolled-back feed log queues no alert.
--
-- BACKDATING SUPPRESSION. feed_logs.logged_at is when the pet was ACTUALLY
-- fed, not when someone tapped Log -- the insert policy allows anything back
-- to now() - 24 hours (20260725090500). So this is an ordinary sequence: fed
-- at 7:05am, hands full, logged at 9pm. Without this rule every other member's
-- phone buzzes at 9pm with "Dylan fed Bailey - 7:05 am", which nobody can act
-- on because Bailey was fed fourteen hours ago.
--
-- The value of a Feed Logged Alert is entirely "don't feed him again" -- it
-- exists to prevent the Double Feed. That value decays with the age of the
-- FEED, not of the log. 30 minutes is roughly the window in which a second
-- person is plausibly about to walk to the bowl, and is comfortably wider than
-- honest lag (feeding then logging two minutes later stays well inside).
--
-- A per-log "send a notification?" checkbox was considered and REJECTED. It
-- inverts control: every other layer (preference, permission) puts the choice
-- with the RECIPIENT, and a sender-side opt-out hands it to the person with
-- the least standing to make it. A considerate user ticks "don't notify", and
-- their partner feeds the dog an hour later -- reintroducing through the UI
-- the exact Double Feed PAW-002 built an RPC to prevent. It also puts a
-- decision inside the three-second logging loop PRODUCT_BRIEF protects.
--
-- The row is WRITTEN when suppressed, not skipped. The suppressed alert is a
-- real record of something that really happened; it simply should not have
-- interrupted anyone. Skipping it would also make "we chose not to interrupt
-- you" indistinguishable from "pg_net never fired" during verification.

create or replace function public.queue_feed_logged_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household_id uuid;
begin
  select pets.household_id into target_household_id
  from public.pets
  where pets.id = new.pet_id;

  if target_household_id is null then
    return new;
  end if;

  insert into public.alerts (household_id, kind, subject_id, actor_id, suppressed_reason)
  values (
    target_household_id,
    'feed_logged',
    new.id,
    new.logged_by,
    case
      when new.logged_at < now() - interval '30 minutes' then 'backdated'
      else null
    end
  );

  return new;
end $$;

-- security definer because the caller has no grants on alerts at all (the
-- table revokes everything from authenticated). The function is the only way
-- an authenticated user causes an alerts row to exist, and it names no
-- caller-supplied table.

create trigger feed_logs_queue_alert
after insert on public.feed_logs
for each row
execute function public.queue_feed_logged_alert();
```

- [ ] **Step 3: Apply and re-run the assertion**

Apply via `apply_migration` with name `queue_feed_logged_alert`.

```sql
select count(*) as triggers from pg_trigger
where tgrelid = 'public.feed_logs'::regclass and tgname = 'feed_logs_queue_alert';
```

Expected: `triggers = 1`.

- [ ] **Step 4: Prove a fresh log queues a sendable alert**

```sql
select a.kind, a.suppressed_reason, a.sent_at
from public.feed_logs f
join public.alerts a on a.subject_id = f.id
order by f.created_at desc
limit 1;
```

To generate one, insert a feed log with `logged_at = now()` through the SQL editor (service role bypasses RLS, which is fine — the trigger is what is under test).

Expected: `kind = feed_logged`, `suppressed_reason` **null**, `sent_at` null.

- [ ] **Step 5: Prove a backdated log queues a suppressed alert**

Insert a second feed log with `logged_at = now() - interval '3 hours'`, then re-run the query above.

Expected: `suppressed_reason = 'backdated'`.

Delete both test logs afterwards — the dev database already carries four deliberate fixtures (see the spec's Open items) and this task should not add to the confusion.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260728090300_queue_feed_logged_alert.sql
git commit -m "feat: queue a Feed Logged Alert, suppressing backdated logs"
```

---

## Task 6: Dispatch queued alerts to the Edge Function

**Files:**
- Create: `supabase/migrations/20260728090400_dispatch_alerts.sql`

**Interfaces:**
- Consumes: `public.alerts` (Task 4).
- Produces: trigger `alerts_dispatch` on `public.alerts`, calling `send-alerts` with header `x-alert-secret`. Task 7 must verify the same secret.

- [ ] **Step 1: Ask the user to create the Vault secrets**

Three values are needed and **must not be committed**. Ask the user to run, in the Supabase SQL editor:

```sql
select vault.create_secret('<a long random string>', 'alert_dispatch_secret');
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-alerts', 'alert_function_url');
```

Ask them to confirm both were created before continuing. Generate the random string with `openssl rand -hex 32` and hand it to them — do not invent a short one.

- [ ] **Step 2: Write the assertion and watch it fail**

```sql
select count(*) as installed from pg_extension where extname = 'pg_net';
```

Expected: `installed = 0`.

- [ ] **Step 3: Write the migration**

```sql
-- pg_net gives the database an async HTTP client. The trigger fires and
-- returns immediately; the response lands in net._http_response later. That
-- asynchrony is the point -- log_feed must not wait on Expo.

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  dispatch_secret text;
begin
  -- A suppressed alert is a record, not a delivery. Never dispatch it.
  if new.suppressed_reason is not null then
    return new;
  end if;

  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'alert_function_url';

  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets where name = 'alert_dispatch_secret';

  if function_url is null or dispatch_secret is null then
    -- Do not fail the feed log because notifications are misconfigured. The
    -- row stays pending with an explanation, and alerts_pending_idx finds it.
    update public.alerts
    set error = 'dispatch skipped: vault secrets missing'
    where id = new.id;
    return new;
  end if;

  perform extensions.net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-secret', dispatch_secret
    ),
    body := jsonb_build_object('alert_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
end $$;

create trigger alerts_dispatch
after insert on public.alerts
for each row
execute function public.dispatch_alert();
```

> The body carries only `alert_id`. The function re-reads the row with the service role rather than trusting a payload — the trigger's job is to say "something is waiting", not to describe it.

- [ ] **Step 4: Apply and re-run the assertion**

Apply via `apply_migration` with name `dispatch_alerts`.

```sql
select count(*) as installed from pg_extension where extname = 'pg_net';
select count(*) as triggers from pg_trigger
where tgrelid = 'public.alerts'::regclass and tgname = 'alerts_dispatch';
```

Expected: `installed = 1`, `triggers = 1`.

- [ ] **Step 5: Prove a dispatch is actually attempted**

Insert a feed log with `logged_at = now()`, then:

```sql
select id, status_code, error_msg, created
from net._http_response order by created desc limit 3;
```

Expected: a row. A 404 or 401 is a **pass** at this stage — the Edge Function does not exist yet. What is being asserted is that the trigger fired and pg_net made a request. A completely empty result is the failure.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260728090400_dispatch_alerts.sql
git commit -m "feat: dispatch queued alerts to the send-alerts function via pg_net"
```

---

## Task 7: The `send-alerts` Edge Function

This is the first Edge Function in the project — `supabase/functions/` does not exist. Deno, not Node: imports are URLs or `npm:` specifiers.

**Files:**
- Create: `supabase/functions/send-alerts/message.ts`
- Create: `supabase/functions/send-alerts/recipients.ts`
- Create: `supabase/functions/send-alerts/expo.ts`
- Create: `supabase/functions/send-alerts/index.ts`

**Interfaces:**
- Consumes: `alerts`, `household_members`, `push_tokens`, `feed_logs`, `pets`, `users`, `households`. Invoked by Task 6 with `{ alert_id }` and header `x-alert-secret`.
- Produces:
  - `buildFeedLoggedMessage(input: FeedLoggedInput): { title: string; body: string; data: { screen: string; params: { logId: string } } }`
  - `resolveRecipientTokens(client, alert): Promise<string[]>`
  - `sendExpoMessages(messages: ExpoMessage[]): Promise<ExpoTicket[]>`

- [ ] **Step 1: Write `message.ts` — the only pure module**

```ts
// Pure: no network, no database. Everything here is a decision about wording,
// which is the part worth reasoning about on its own -- and the part a future
// missed_feed kind will extend rather than rewrite.

export type FeedLoggedInput = {
  authorFirstName: string | null;
  petName: string;
  loggedAt: string;
  householdTimezone: string;
  notes: string | null;
  logId: string;
};

export type ExpoMessage = {
  to: string[];
  title: string;
  body: string;
  sound: 'default';
  data: { screen: string; params: { logId: string } };
};

// Matches formatAuthorName in src/hooks/use-household-members.ts. Every surface
// must agree -- the Home slot row, the Activity row, the detail sheet and this
// notification all render the same feed log, and three different names for one
// person reads as a bug.
const authorName = (firstName: string | null): string => firstName ?? 'Member';

// The household's timezone, never the recipient's device timezone -- the same
// rule every other surface follows.
const timeOfDay = (loggedAt: string, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  })
    .format(new Date(loggedAt))
    .toLowerCase();

export const buildFeedLoggedMessage = (
  input: FeedLoggedInput
): Omit<ExpoMessage, 'to'> => {
  const time = timeOfDay(input.loggedAt, input.householdTimezone);
  const trimmedNotes = input.notes?.trim();

  return {
    title: `${authorName(input.authorFirstName)} fed ${input.petName}`,
    body: trimmedNotes ? `${time} · ${trimmedNotes}` : time,
    sound: 'default',
    data: { screen: '/activity', params: { logId: input.logId } }
  };
};
```

> `data.screen` and `data.params` are the exact shape `usePushNotifications` reads, and `/activity?logId=…` is a deep link `activity/index.tsx` already handles — so a tap lands on the correction sheet with no new routing.

- [ ] **Step 2: Verify the pure module in isolation**

There is no test runner, so exercise it directly:

Run: `bunx deno eval --quiet "$(cat <<'EOF'
const m = await import('./supabase/functions/send-alerts/message.ts');
const withNotes = m.buildFeedLoggedMessage({
  authorFirstName: 'Dylan', petName: 'Bailey',
  loggedAt: '2026-07-28T21:05:00Z', householdTimezone: 'Australia/Brisbane',
  notes: 'Half a scoop, plus her tablet', logId: 'abc'
});
const noNotes = { ...withNotes };
console.log(JSON.stringify(withNotes));
console.log(JSON.stringify(m.buildFeedLoggedMessage({
  authorFirstName: null, petName: 'Bailey',
  loggedAt: '2026-07-28T21:05:00Z', householdTimezone: 'Australia/Brisbane',
  notes: '   ', logId: 'abc'
})));
EOF
)"`

Expected, exactly:
- First line title `Dylan fed Bailey`, body `7:05 am · Half a scoop, plus her tablet`.
- Second line title `Member fed Bailey`, body `7:05 am` — **no trailing ` · `**. Whitespace-only notes must be treated as absent.

`2026-07-28T21:05:00Z` is 7:05 am on the 29th in Brisbane, which is exactly the case that would render wrongly if the timezone were ignored. If you see `9:05 pm`, the `timeZone` option is not being applied.

- [ ] **Step 3: Write `recipients.ts`**

```ts
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// The delivery rule (ADR 0012): a Feed Logged Alert goes to every member of
// the household EXCEPT the author, unless that member has turned Feed Logged
// Alerts off. Role does not appear in the rule -- role-based routing was
// rejected because ADR 0001 allows multiple Owners and the realistic v1
// household is a couple who are both Owners, so it would notify nobody.
export const resolveRecipientTokens = async (
  client: SupabaseClient,
  alert: { household_id: string; actor_id: string | null }
): Promise<string[]> => {
  let query = client
    .from('household_members')
    .select('user_id')
    .eq('household_id', alert.household_id)
    .eq('feed_logged_alerts', true);

  if (alert.actor_id) {
    query = query.neq('user_id', alert.actor_id);
  }

  const { data: members, error: membersError } = await query;
  if (membersError) throw membersError;
  if (!members || members.length === 0) return [];

  const { data: tokens, error: tokensError } = await client
    .from('push_tokens')
    .select('token')
    .in(
      'user_id',
      members.map((member) => member.user_id)
    );

  if (tokensError) throw tokensError;

  return (tokens ?? []).map((row) => row.token);
};
```

- [ ] **Step 4: Write `expo.ts`**

```ts
import type { ExpoMessage } from './message.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo documents a ceiling of 100 messages per request. The rate ceiling
// (600/s per project) is far above anything this app will produce, so batching
// is the only limit worth respecting here.
const BATCH_SIZE = 100;

export type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

export const sendExpoMessages = async (messages: ExpoMessage[]): Promise<ExpoTicket[]> => {
  const tickets: ExpoTicket[] = [];

  for (let index = 0; index < messages.length; index += BATCH_SIZE) {
    const batch = messages.slice(index, index + BATCH_SIZE);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      throw new Error(`Expo push failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as { data?: ExpoTicket[] };
    tickets.push(...(payload.data ?? []));
  }

  return tickets;
};
```

- [ ] **Step 5: Write `index.ts`**

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildFeedLoggedMessage, type ExpoMessage } from './message.ts';
import { sendExpoMessages } from './expo.ts';
import { resolveRecipientTokens } from './recipients.ts';

// verify_jwt = false: this is called by the DATABASE, not by a user. It
// authenticates on a shared secret from Vault instead, and reads with the
// service role.
const DISPATCH_SECRET = Deno.env.get('ALERT_DISPATCH_SECRET');

Deno.serve(async (request) => {
  if (request.headers.get('x-alert-secret') !== DISPATCH_SECRET) {
    return new Response('Unauthorised', { status: 401 });
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { alert_id: alertId } = (await request.json()) as { alert_id: string };

  const { data: alert, error: alertError } = await client
    .from('alerts')
    .select('id, household_id, kind, subject_id, actor_id, sent_at, suppressed_reason')
    .eq('id', alertId)
    .single();

  if (alertError || !alert) return new Response('Alert not found', { status: 404 });
  if (alert.sent_at || alert.suppressed_reason) return new Response('Already handled');
  if (alert.kind !== 'feed_logged') return new Response('Unsupported kind');

  const { data: log, error: logError } = await client
    .from('feed_logs')
    .select('id, logged_at, notes, logged_by, pets ( name, households ( timezone ) )')
    .eq('id', alert.subject_id)
    .single();

  if (logError || !log) return new Response('Feed log not found', { status: 404 });

  const { data: author } = await client
    .from('users')
    .select('first_name')
    .eq('id', log.logged_by)
    .maybeSingle();

  const tokens = await resolveRecipientTokens(client, alert);

  if (tokens.length === 0) {
    await client
      .from('alerts')
      .update({ sent_at: new Date().toISOString(), error: 'no recipients' })
      .eq('id', alert.id);
    return new Response('No recipients');
  }

  // deno-lint-ignore no-explicit-any
  const pet = (log as any).pets;

  const message: ExpoMessage = {
    to: tokens,
    ...buildFeedLoggedMessage({
      authorFirstName: author?.first_name ?? null,
      petName: pet.name,
      loggedAt: log.logged_at,
      householdTimezone: pet.households.timezone,
      notes: log.notes,
      logId: log.id
    })
  };

  try {
    const tickets = await sendExpoMessages([message]);

    // DeviceNotRegistered is acted on immediately: the token is dead and will
    // never work again. Leaving it means every future send carries a
    // guaranteed failure.
    const dead = tickets
      .map((ticket, index) => ({ ticket, token: tokens[index] }))
      .filter(({ ticket }) => ticket.details?.error === 'DeviceNotRegistered')
      .map(({ token }) => token);

    if (dead.length > 0) {
      await client.from('push_tokens').delete().in('token', dead);
    }

    const firstError = tickets.find(
      (ticket) => ticket.status === 'error' && ticket.details?.error !== 'DeviceNotRegistered'
    );

    await client
      .from('alerts')
      .update({ sent_at: new Date().toISOString(), error: firstError?.message ?? null })
      .eq('id', alert.id);

    return new Response('Sent');
  } catch (error) {
    await client
      .from('alerts')
      .update({ error: error instanceof Error ? error.message : 'unknown' })
      .eq('id', alert.id);
    return new Response('Send failed', { status: 500 });
  }
});
```

- [ ] **Step 6: Deploy with JWT verification off**

Deploy via the Supabase MCP `deploy_edge_function` tool, name `send-alerts`, with `verify_jwt: false`.

Then ask the user to set the function secret (it is not the same store as Vault):

> Run `! bunx supabase secrets set ALERT_DISPATCH_SECRET=<the same string from Task 6 Step 1>`

The two must match exactly or every dispatch returns 401.

- [ ] **Step 7: Prove recipient resolution and payload construction — before any credentials**

This is the assertion that matters most, and it works with **fake tokens**. Expo returns a `DeviceNotRegistered` ticket for a well-formed but invalid token, so "we resolved the right members, skipped the author, honoured the mute, and built a valid payload" is provable against the real API.

Seed a fake token for the second member (Task 13 creates that member — if it does not exist yet, do Task 13 Step 1 first):

```sql
insert into public.push_tokens (token, user_id, platform)
values ('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', '<second member user_id>', 'ios');
```

Insert a feed log with `logged_at = now()`, then:

```sql
select sent_at, error, suppressed_reason from public.alerts order by created_at desc limit 1;
select count(*) as remaining from public.push_tokens
where token = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
```

Expected: `sent_at` is **stamped**, and `remaining = 0` — the fake token was deleted on `DeviceNotRegistered`. That single result proves the whole chain except the Expo → APNs hop.

Also assert the author is excluded: log a feed **as the second member** and confirm the resolved token count is zero when only that member has a token.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/send-alerts
git commit -m "feat: add the send-alerts Edge Function"
```

---

## Task 8: Register and delete push tokens

**Files:**
- Create: `src/services/push-token.service.ts`
- Modify: `src/services/auth.service.ts`

**Interfaces:**
- Consumes: `Constants.expoConfig.extra.eas.projectId` (Task 1), `public.push_tokens` (Task 2).
- Produces: `registerPushToken(userId: string): Promise<string | null>` and `deletePushToken(): Promise<void>`, both consumed by Task 9.

- [ ] **Step 1: Read the file you are mirroring**

Read `src/services/auth.service.ts` in full. Match its export style (default object vs named exports), its error handling, and its import ordering. Do not invent a different convention.

- [ ] **Step 2: Write `push-token.service.ts`**

```ts
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase/client';
import { isIOS } from '@/utils/platform';

/**
 * Registration and the OS permission prompt are separate decisions.
 * Registration is attempted on every sign-in and every foreground; it returns
 * null without prompting when permission has not been granted. The prompt is
 * owned by the priming sheet.
 *
 * The original hook assigned `token` only inside `if (isIOS)`, so Android
 * could never register even once credentials existed. Platform now affects
 * only the channel setup and the recorded `platform` value.
 */
export const registerPushToken = async (userId: string): Promise<string | null> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  // The conflict clause handles two accounts on one phone: sign out, sign in
  // as your partner to test, and the same token is reassigned rather than left
  // as a stale row pushing one person's household alerts into another session.
  const { error } = await supabase.from('push_tokens').upsert(
    {
      token,
      user_id: userId,
      platform: isIOS ? 'ios' : 'android',
      last_seen_at: new Date().toISOString()
    },
    { onConflict: 'token' }
  );

  if (error) throw error;

  return token;
};

/**
 * Called on sign-out. A handed-down or shared phone otherwise keeps receiving
 * a previous user's household alerts, which is a privacy leak rather than
 * mere noise.
 */
export const deletePushToken = async (): Promise<void> => {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // Best effort. Never block sign-out on a token that cannot be resolved --
    // being unable to sign out is a far worse failure than a stale row, which
    // the DeviceNotRegistered sweep will clear anyway.
  }
};
```

- [ ] **Step 3: Delete the token on sign-out**

In `src/services/auth.service.ts`, call `await deletePushToken()` **before** `supabase.auth.signOut()`. Order matters: the delete is an RLS-gated write requiring `auth.uid()`, and after sign-out there is no session to authorise it.

- [ ] **Step 4: Verify**

Run: `bun run typecheck && bun run lint && bun run spellcheck`
Expected: all three pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/push-token.service.ts src/services/auth.service.ts
git commit -m "feat: register push tokens on sign-in and clear them on sign-out"
```

---

## Task 9: Rewrite `usePushNotifications` and mount it

**Files:**
- Modify: `src/hooks/use-push-notifications.ts` (rewrite)
- Modify: `src/app/_layout.tsx:19-36`

**Interfaces:**
- Consumes: `registerPushToken` (Task 8), `useAuthStore` (`status`, `userId`), `useHousehold`.
- Produces: a mounted hook. No return value is consumed by any other task.

The existing hook has never been mounted and has three defects to fix rather than preserve:

1. `token` is assigned only inside `if (isIOS)` — Android can never register (fixed in Task 8).
2. The handler sets deprecated `shouldShowAlert: true` alongside `shouldShowBanner: false` and `shouldShowList: false`. **In SDK 57 that means a foreground notification displays nothing.**
3. Permission is requested on mount, wherever that mount happens to be.

- [ ] **Step 1: Read the SDK 57 docs**

Read `https://docs.expo.dev/versions/v57.0.0/sdk/notifications/`. Confirm the current shape of `setNotificationHandler`, `useLastNotificationResponse`, and `requestPermissionsAsync` options before writing. Training data on this module is stale — the `shouldShowAlert` deprecation is exactly that kind of drift.

- [ ] **Step 2: Rewrite the hook**

```ts
import * as Notifications from 'expo-notifications';
import { RelativePathString, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useHousehold } from '@/hooks/use-household';
import { registerPushToken } from '@/services/push-token.service';
import { useAuthStore } from '@/stores/auth-store';

// shouldShowAlert is deprecated in SDK 57 and setting it alongside
// shouldShowBanner: false / shouldShowList: false is why a foregrounded
// notification previously displayed NOTHING.
//
// Badges are off in this pass: a badge count implies an inbox to clear, and
// there isn't one yet.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export const usePushNotifications = () => {
  const router = useRouter();
  const { status, userId } = useAuthStore();
  const { data: household } = useHousehold();

  const handledResponseId = useRef<string | null>(null);

  // addNotificationResponseReceivedListener alone is NOT reliable for a tap
  // that launches the app from terminated -- the listener attaches after the
  // response has already been delivered. useLastNotificationResponse replays
  // it. Deduplicating on the request identifier is what makes replay safe, and
  // it removes the old isNavigatingRef setTimeout(..., 1000) hack.
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (status !== 'signedIn' || !userId) return;

    void registerPushToken(userId).catch(() => {
      // Non-fatal. A user without a token simply receives nothing; the app is
      // fully usable, and the next foreground tries again.
    });

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void registerPushToken(userId).catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [status, userId]);

  useEffect(() => {
    if (!lastResponse) return;

    // A cold-start tap must not try to push /activity at the auth stack, and
    // must not race the household query the destination screen depends on.
    if (status !== 'signedIn' || !household) return;

    const identifier = lastResponse.notification.request.identifier;
    if (handledResponseId.current === identifier) return;
    handledResponseId.current = identifier;

    const data = lastResponse.notification.request.content.data;
    if (!data?.screen) return;

    router.push({
      pathname: data.screen as RelativePathString,
      params: data.params as Record<string, string>
    });
  }, [lastResponse, status, household, router]);
};
```

- [ ] **Step 3: Mount it inside `AuthGate`**

In `src/app/_layout.tsx`, add to `AuthGate` (line 19), alongside `useAuthSession()` and `useUserProfile()`:

```tsx
usePushNotifications();
```

`AuthGate` is the right mount point because a `userId` exists there and the router is mounted. Mounting in `RootLayout` would run it before the auth store has resolved.

- [ ] **Step 4: Verify**

Run: `bun run typecheck && bun run lint && bun run spellcheck`
Expected: all three pass.

- [ ] **Step 5: Prove the client half with a local notification — no credentials needed**

This exercises every line of the hook except token acquisition. In the running app, schedule a local notification carrying an identical payload:

```ts
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Dylan fed Bailey',
    body: '7:05 am · Half a scoop, plus her tablet',
    data: { screen: '/activity', params: { logId: '<a real feed_logs.id>' } }
  },
  trigger: { seconds: 2 }
});
```

Assert three things, each measured with argent's `describe`, never from a screenshot:

1. **Foreground:** with the app open, the banner **appears**. If it does not, `setNotificationHandler` is wrong — this is defect 2.
2. **Background tap:** background the app, tap the notification, land on Activity with the correction sheet open for that log.
3. **Cold start:** force-quit, fire the notification, tap it. Same destination. This is the case `useLastNotificationResponse` exists for and the one that most often regresses.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-push-notifications.ts src/app/_layout.tsx
git commit -m "feat: rewrite usePushNotifications and mount it in AuthGate"
```

---

## Task 10: The priming sheet

**Files:**
- Create: `src/components/bottom-sheets/notification-priming-sheet.tsx`
- Modify: `src/app/(protected)/(tabs)/home/index.tsx`
- Modify: `src/constants/icon-map.ts`

**Interfaces:**
- Consumes: `BaseSheet`, `MainButton`, `AppText`, `usePet`.
- Produces: `<NotificationPrimingSheet sheetRef={ref} />`, presented imperatively.

- [ ] **Step 1: Invoke the design skills**

Invoke `/frontend-design` and `/expo-native-ui` **before writing any code**. AGENTS.md requires this for any new component. Not after, not to review.

- [ ] **Step 2: Read the sheet you are mirroring**

Read `src/components/bottom-sheets/log-feed-sheet.tsx` in full for the established structure: `BaseSheet` usage, ref typing, `detents`, and how it dismisses.

- [ ] **Step 3: Add the `bell` icon**

In `src/constants/icon-map.ts`, add one line mapping a semantic key to Lucide's `Bell`:

```ts
bell: Bell,
```

Add the `Bell` import to the existing `lucide-react-native` import in that file — and **only** that file.

- [ ] **Step 4: Write the sheet**

Structure, with copy fixed (Australian English, concrete not abstract):

- Title: **Get told when someone feeds {petName}**
- Body: **So nobody doubles up. We'll let you know the moment another member logs a feed — and nothing else.**
- Primary: `MainButton` **Turn on notifications** → `Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false, provideAppNotificationSettings: true } })`, then dismiss.
- Secondary: `MainButton` variant `secondary`, **Not now** → dismiss.

`detents={['auto']}` — this is a content-sized confirmation, not a scrollable form.

`provideAppNotificationSettings: true` is what makes iOS show a button inside its own Settings page that deep-links back into Crumpet's notification screen (Task 11). Without it that route is unreachable from Settings.

> `allowProvisional` was considered and rejected. It sidesteps the one-shot problem, but a provisional alert makes no sound and shows no banner — and "your partner just fed the dog" is worthless if you find it tomorrow.

- [ ] **Step 5: Present it once, from Home**

The prompt fires **once**, on the first render of Home after onboarding. Persist a `hasPrimedNotifications` flag — follow whatever persistence the codebase already uses (check `src/stores/` and `src/lib/` before choosing; do not introduce a new dependency).

Present only when `getPermissionsAsync()` returns `NOT_DETERMINED` **and** the flag is unset. Set the flag when the sheet dismisses, however it dismisses.

> Home rather than onboarding: `feeding-schedule.tsx:80` calls `create_household_and_pet`, which flips `hasHousehold` and makes `(onboarding)` unreachable — so priming inside onboarding would sit *before* the schedule exists, where the pitch is abstract ("we'll notify you about feeds") rather than concrete ("we'll tell you if Bailey's 7am is missed"). It also keeps a permission dialog out of the three-second logging loop.

- [ ] **Step 6: Verify**

Run: `bun run typecheck && bun run lint && bun run spellcheck`

On the simulator, with the app freshly installed: the sheet appears once on Home, the OS dialog follows the primary button, and **it does not appear again** after a restart.

- [ ] **Step 7: Commit**

```bash
git add src/components/bottom-sheets/notification-priming-sheet.tsx src/app/\(protected\)/\(tabs\)/home/index.tsx src/constants/icon-map.ts
git commit -m "feat: prime the notification permission once from Home"
```

---

## Task 11: Manage Notifications

**Files:**
- Create: `src/app/(protected)/(tabs)/profile/notifications.tsx`
- Create: `src/components/screens/profile/notification-settings.tsx`
- Create: `src/hooks/use-notification-preferences.ts`
- Modify: `src/components/core/toggle-switch.tsx`
- Modify: `src/app/(protected)/(tabs)/profile/_layout.tsx`
- Modify: `src/app/(protected)/(tabs)/profile/index.tsx`

**Interfaces:**
- Consumes: `useHousehold`, `useAuthStore`, the preference columns (Task 3).
- Produces: `useNotificationPreferences()` returning `{ data: { feedLoggedAlerts: boolean } | undefined, isLoading: boolean, setFeedLoggedAlerts: (value: boolean) => void }`.

**This is the first pushed route in the app.** Every tab today is a single-screen stack with `headerShown: false`, each screen rendering its own `AppText` header. This task establishes the pattern: **tab roots keep the big `AppText` header and no native header; pushed screens get the native header and its automatic back arrow.**

- [ ] **Step 1: Invoke the design skills**

`/frontend-design` and `/expo-native-ui`, before any code.

- [ ] **Step 2: Add `isDisabled` to `ToggleSwitch`**

This is the change that makes the honesty rule enforceable rather than aspirational.

```tsx
type Props = {
  marginTop?: number;
  marginBottom?: number;
  label: string;
  description: string;
  value: boolean;
  isDisabled?: boolean;
  onChange: (value: boolean) => void;
};
```

Pass `disabled={isDisabled}` to `Switch`, and render both `AppText` elements in `textSecondary` when disabled so the row reads as inert rather than merely unresponsive.

`ToggleSwitch` has exactly one existing consumer (`src/app/(protected)/(onboarding)/pet-details.tsx:161`), and the prop is optional, so this cannot break it.

- [ ] **Step 3: Write `use-notification-preferences.ts`**

A TanStack Query read of `household_members.feed_logged_alerts` for `(householdId, userId)`, plus a mutation that writes it and invalidates the query. Follow the shape of `src/hooks/use-household-members.ts` — same client, same `enabled: Boolean(...)` guard, same error propagation.

Do **not** expose `missed_feed_alerts`. The column exists; nothing reads it this pass.

- [ ] **Step 4: Write `notification-settings.tsx`**

Driven by `getPermissionsAsync()`, which returns `canAskAgain` and `ios.status`. Three states, one heading (**Manage Notifications**):

| State | UI |
| --- | --- |
| `NOT_DETERMINED` | one row that presents the priming sheet. No toggles. |
| `AUTHORIZED` | one `ToggleSwitch` — **Feed Logged Alerts** / "Know when someone feeds {petName}." |
| `DENIED` | the same toggle, **`isDisabled`**, plus one explanatory line and an **Open Settings** button. |

Denied copy, exactly: *"Notifications are turned off for Crumpet, so you won't hear when someone feeds {petName}."* — the consequence and nothing more. Button calls `Linking.openSettings()`.

> Disabling the toggle is the point. A toggle reading "on" while iOS silently drops every push is the app lying about its own state — the trust failure PRODUCT_BRIEF says makes people delete it.
>
> **No Missed Feed Alerts toggle**, and **no master "All notifications" switch.** The first would be a control for an alert that cannot fire (no `pg_cron`, no engine); the second would be the same switch as the only category, rendered twice. The master arrives with the second category, as a real stored column checked server-side — derived state cannot be enforced by the send query, and the send query is the layer that matters.

Re-read permission on foreground, hanging off the existing `AppState` listener pattern in `src/app/_layout.tsx:45-51`, so returning from Settings updates the screen immediately.

- [ ] **Step 5: Wire the route and fix the header pattern**

`notifications.tsx` renders `<NotificationSettings />` and nothing else.

In `profile/_layout.tsx`, replace the current `<Stack screenOptions={{ headerShown: false }} />` with per-screen options:

```tsx
<Stack>
  <Stack.Screen name="index" options={{ headerShown: false }} />
  <Stack.Screen name="notifications" options={{ headerTitle: 'Notifications' }} />
</Stack>
```

> The uncommitted `headerTitle: 'Profile'` currently on this branch does the opposite — it puts a native header on the **tab root**, where `index.tsx` already renders `<AppText variant="header" size={32}>Profile</AppText>`, giving two titles. Discard that change in favour of the above.

In `profile/index.tsx`, add a pressable row above **Sign out** that routes to `/profile/notifications`. Use `Icon name="bell"` for it.

- [ ] **Step 6: Verify**

Run: `bun run typecheck && bun run lint && bun run spellcheck`

On the simulator, measured with argent's `describe`:
1. Profile → Notifications pushes, the native header reads **Notifications**, and the back arrow returns to Profile.
2. With permission granted, the toggle flips and the value **survives a restart** (it round-tripped to the database, not just local state).
3. Deny permission in Settings, return to the app: the toggle is disabled, the explanatory line is present, and **Open Settings** opens iOS Settings.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(protected\)/\(tabs\)/profile src/components/screens/profile/notification-settings.tsx src/hooks/use-notification-preferences.ts src/components/core/toggle-switch.tsx
git commit -m "feat: add the Manage Notifications screen"
```

---

## Task 12: Say who will be notified

**Files:**
- Modify: `src/components/bottom-sheets/log-feed-sheet.tsx`

**Interfaces:**
- Consumes: `useHouseholdMembers`, `formatAuthorName`, `useAuthStore`.
- Produces: nothing.

This is the transparency half of the decision not to build a per-log notify toggle. It tells you what is about to happen without offering you a lever over someone else's awareness.

- [ ] **Step 1: Invoke `/frontend-design`**

- [ ] **Step 2: Add the line**

Below the notes field, above the primary button, one `AppText size={13} color="textSecondary"` line naming the members who will actually receive it — household members, minus the signed-in user, minus anyone with `feed_logged_alerts = false`.

The list must use `formatAuthorName`'s convention (first name), so the sheet agrees with the notification, the Home slot row, the Activity row and the detail sheet.

Copy: `Alex will be notified` (one), `Alex and Sam will be notified` (two), `Alex, Sam and 2 others will be notified` (more). Render **nothing** when the list is empty — "Nobody will be notified" invites a fix for something that is not broken.

`useHouseholdMembers` does not currently select the preference columns; extend its select and its `HouseholdMember` type in `src/types/core.ts` rather than issuing a second query.

- [ ] **Step 3: Verify**

Run: `bun run typecheck && bun run lint && bun run spellcheck`

On the simulator: with the second member seeded and their preference on, the sheet reads **"<name> will be notified"**. Turn their preference off in the database, refetch, and the line disappears.

- [ ] **Step 4: Commit**

```bash
git add src/components/bottom-sheets/log-feed-sheet.tsx src/hooks/use-household-members.ts src/types/core.ts
git commit -m "feat: name who will be notified in the log feed sheet"
```

---

## Task 13: Documentation

**Files:**
- Modify: `CONTEXT.md`
- Modify: `AGENTS.md`
- Create: `docs/adr/0012-recipient-controlled-delivery-and-the-alert-outbox.md`

- [ ] **Step 1: Add the glossary terms to `CONTEXT.md`**

Keep it a glossary — no implementation detail, no table names.

- **Alert** — a notification queued for the members of a household. Either a Feed Logged Alert or a Missed Feed Alert.
- **Feed Logged Alert** — tells the household that someone has fed the pet. Goes to every member except the author, unless that member has turned them off.
- **Missed Feed Alert** — tells the household that a scheduled feed passed without one. Not yet built.
- **Suppressed Alert** — an alert that was recorded but deliberately not delivered, because the feed it describes was logged too long after it happened to be worth interrupting anyone.

- [ ] **Step 2: Add the write-path note to `AGENTS.md`**

Under the existing feed-logging guidance: the only write path for a feed log is the `log_feed` RPC, never a table insert — and logging a feed now also queues an Alert, so anything that bypasses `log_feed` silently skips notifications.

- [ ] **Step 3: Write ADR 0012**

Follow the structure of the existing ADRs (read `docs/adr/0009-symmetric-grace-window-derived-slot-matching.md` for the house style). It covers three linked decisions, all hard to reverse:

1. **Delivery is universal, not role-based.** Role does not appear in the rule. Role-based routing leaves the important case unspecified — ADR 0001 allows multiple Owners, and the realistic v1 household is a couple who are both Owners, so it would notify nobody and the PRODUCT_BRIEF v1 milestone could not happen. It is also the wrong axis: Owner and Contributor are permissions concepts, and the midday dog walker is precisely the person who most needs to know the dog was fed at 7am. The annoyance role-routing was meant to solve is handled by **defaults** instead — Contributors start with Feed Logged Alerts off. A default is a toggle the user already has; a routing rule is a migration and an ADR.
2. **An outbox, not a direct trigger.** Justified by the missed-feed cron's need for idempotency. Also buys an audit trail and a place to retry from.
3. **The recipient controls delivery, never the sender.** Why there is no per-log "notify?" toggle, and why backdating suppression is an automatic rule instead. Record the 30-minute threshold and that it is a judgement, not a derivation.

- [ ] **Step 4: Verify and commit**

Run: `bun run spellcheck` — add any new project words to `cspell.json` rather than disabling the rule.

```bash
git add CONTEXT.md AGENTS.md docs/adr/0012-recipient-controlled-delivery-and-the-alert-outbox.md
git commit -m "docs: record the delivery rule, the outbox and the alert glossary"
```

---

## Task 14: End-to-end verification

**Files:** none.

Everything before this was provable without credentials. This task is the last hop.

- [ ] **Step 1: Seed a second household member**

`household_members` has a **founding-owner-only** insert policy (`20260723090000_pet_household_onboarding.sql:122`) — `role = 'owner'` and `not exists (any member of that household)`. A second member therefore **cannot** be created through the app, and this is a service-role insert in the SQL editor. That is expected: the invite flow does not exist.

Create a second auth user through the Supabase dashboard, then:

```sql
insert into public.household_members (household_id, user_id, role, feed_logged_alerts)
values ('<household id>', '<second user id>', 'owner', true);
```

> **`feed_logged_alerts = true` is not optional.** The column default is `false`, and the role-based `true` is written only by `create_household_and_pet`, which this insert bypasses. Omit it and the member is muted — and a muted recipient is indistinguishable from a broken APNs key, a wrong `projectId`, a missing Vault secret, or a `pg_net` call that never fired. You would debug the entire chain to find one boolean.

Also insert a `public.users` row for them if `create_household_and_pet`'s usual path would have done so — check whether a trigger on `auth.users` already handles it before inserting by hand.

- [ ] **Step 2: Sign in as the second member on a second simulator**

Boot a second iOS simulator via argent's `boot-device`, install the dev client from Task 1, sign in as the second account. Confirm a real token landed:

```sql
select user_id, platform, last_seen_at from public.push_tokens;
```

Expected: a row whose `token` starts `ExponentPushToken[` for the second user.

- [ ] **Step 3: Log a feed as the first member and watch it arrive**

On the first simulator, log a feed with the time left at now. On the second simulator, the banner should appear.

Assert the database agrees:

```sql
select kind, actor_id, sent_at, error, suppressed_reason
from public.alerts order by created_at desc limit 1;
```

Expected: `sent_at` stamped, `error` null, `suppressed_reason` null.

- [ ] **Step 4: Assert the four rules that define the feature**

1. **Author excluded** — the logging device receives nothing.
2. **Mute honoured** — set the second member's `feed_logged_alerts` to `false`, log again, confirm `alerts.error = 'no recipients'` and no banner.
3. **Backdating suppressed** — log a feed with the time spinner set three hours back. Confirm `suppressed_reason = 'backdated'`, `sent_at` null, and **no banner on either device**.
4. **Tap routing** — tap a delivered notification on the second simulator and land on Activity with the correction sheet open for that log. Repeat from a force-quit.

Each measured with argent's `describe`, never asserted from a screenshot.

- [ ] **Step 5: Open the PR**

Use the `create-pr` skill. Title: `[PAW-003] Send push notifications when a feed is logged`.

---

## Deferred — do not build in this pass

- **Push receipts.** This pass acts on ticket-time errors only. Expo recommends fetching receipts ~15 minutes after sending, which catches failures tickets do not. Add a receipts sweep when `pg_cron` is installed for the missed-feed engine — a schedule entry against machinery that will already exist.
- **The missed-feed engine** (ADR 0002) — `pg_cron`, `missed_feed` alerts. Reuses this pass's delivery path unchanged.
- **Home surfacing missed feeds.** Note this needs **none** of the above: `SlotStateValue` already includes `'missed'` (`src/types/core.ts:67`), computed server-side by `pet_slot_states` and already consumed by `useSlotStates`. It is a read-side, client-only change and could ship at any time.
- **The master "All notifications" switch** — with the second category, as a real column.
- **In-app notification history** — an `alerts` select policy scoped to household membership, plus `alert_reads (alert_id, user_id, read_at)`.
- **Android.** FCM v1 credentials and `google-services.json` (`app.config.ts:33`, commented out) are a separate credential exercise. The schema, the Edge Function and the Expo API are all platform-agnostic; only the notification channel setup is deferred.
