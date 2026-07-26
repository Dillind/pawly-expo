# PAW-002 Double Feed Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A server-side Double Feed guard inside a single `log_feed` RPC, and a confirm-and-create sheet that raises its warning inline.

**Architecture:** The Double Feed test is derived, never stored: `private.slot_states` gains a third parameter carrying a hypothetical log timestamp, and `public.log_feed` runs the existing greedy assignment twice — once with the hypothetical, once without — and warns when the satisfied-slot count fails to rise. Deciding and inserting happen in one transaction so two people feeding the dog at 6pm cannot both be told "no double feed". The client stops naming `feed_logs` columns entirely and calls the RPC.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Supabase (Postgres + PostgREST RPC), TanStack Query, react-hook-form + Zod, `@lodev09/react-native-true-sheet`.

## Why this is its own branch

The spec scopes the guard inside PAW-001. It was split out because `feat/PAW-001-feed-logging` had already reached **25 commits, 58 files, +7228 / -250** before this work added a line, and because the two migrations here are not revertible by `git revert` alone — they are far easier to back out of a small branch than a 60-file one.

Two pieces the spec lists under part 1 therefore ship in PAW-001, not here: **reaching the correction sheet** (`FeedLogRow`'s handler, the pressable fed `SlotRow`) and the **native time spinner** in that sheet. Both are done before this branch is cut. See `2026-07-26-paw-001-reach-the-correction-sheet.md`.

Push notifications become **PAW-003**.

## Global Constraints

- **Source of truth:** `docs/superpowers/specs/2026-07-26-double-feed-guard-and-push-notifications-design.md`. Part 1 only. Do not build any part of PAW-003 (push tokens, `alerts`, Edge Function, `usePushNotifications`).
- **Branch:** `feat/PAW-002-double-feed-guard`, cut from `main` **after PAW-001 has merged**. Never commit to `main`. If PAW-001 is still open, stop — Task 3 renames a file PAW-001 is still editing.
- **No test runner exists.** There is no `test` script and no framework. Do not invent one in this plan. Every task verifies through: `bun run typecheck`, `bun run lint`, `bun run spellcheck`, read-only SQL against the dev project, and measured on-device checks.
- **Node:** `export PATH="$HOME/.volta/bin:$PATH"` before any `bun run` — the shell's default Node 20 cannot run cspell at all.
- **Supabase project:** `dofjrttcyjtzvqyttqdo` (name `pawly`). Migrations are applied with the Supabase MCP `apply_migration`, not a local CLI. The local file under `supabase/migrations/` is the record; the remote version string is the timestamp at apply time and will not match the filename. That is already true of every existing migration.
- **DO NOT DELETE any `feed_logs` rows.** Four test logs predate this work, all 26 July, Bailey, no notes, not backdated. Three (3:05, 3:19, 3:20 pm Brisbane) fall outside every Grace Window; the fourth (4:25 pm) satisfies dinner. They are kept deliberately as fixtures — see the spec's Open items. No task here deletes, truncates, or "tidies" them.
- **Do not write rows as service role.** MCP `execute_sql` bypasses RLS and has no `auth.uid()`, so an insert through it would create a junk log with `logged_by = null`. All SQL verification in this plan is **read-only**; every write is exercised through the app on device.
- **Prose is Australian/British English** (colour, organise, cancelled, "tick" not "check"). Code identifiers stay American. Add project words to `cspell.json` rather than disabling rules.
- **Prettier:** 100-char width, single quotes, **no trailing commas**, `bracketSameLine: true`.
- **Before any UI task, invoke `/frontend-design` and `/expo-native-ui`.** This is an AGENTS.md requirement (`Before changing any UI`), and each UI task below repeats it as an explicit first step.
- **Any time a user sets is a `DateTimePickerValidated` with `mode="time"`** (AGENTS.md, `Dates and times`). Never a text field.
- **Measure, don't assert.** On-device claims go through argent's `describe`, never a screenshot alone. Discovery before every tap.
- **Icons** come only from `@/components/core/icon`, via the allow-list in `src/constants/icon-map.ts`.
- **Commit after every task.** Conventional commit types (`feat`, `fix`, `chore`, `docs`, `refactor`). End the message with `Co-Authored-By: Claude <noreply@anthropic.com>`.

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `supabase/migrations/20260726090000_slot_states_hypothetical.sql` | Drop/recreate `private.slot_states` at three arguments; recreate `public.pet_slot_states` with an explicit column list; re-apply grants |
| `supabase/migrations/20260726090100_log_feed_rpc.sql` | `public.log_feed` — the one write path for a feed log |
| `src/components/bottom-sheets/log-feed-sheet.tsx` | Create a feed: notes, submit, inline Double Feed warning |

**Renamed:**

| From | To | Why |
| --- | --- | --- |
| `src/components/bottom-sheets/feed-log-sheet.tsx` | `src/components/bottom-sheets/feed-log-detail-sheet.tsx` | `feed-log-sheet` and `log-feed-sheet` differ only in word order — a bug waiting to be written |

**Deleted:**

| Path | Why |
| --- | --- |
| `src/components/bottom-sheets/double-feed-sheet.tsx` | Never had a caller; replaced by the inline warning |

**Modified:**

| Path | Change |
| --- | --- |
| `src/hooks/use-feed-log-mutations.ts` | `useLogFeed` calls the RPC and returns a discriminated result |
| `src/app/(protected)/(tabs)/home/index.tsx` | Popover presents the create sheet instead of writing; detail-sheet import renamed |
| `src/app/(protected)/(tabs)/activity/index.tsx` | Popover presents the create sheet instead of writing; detail-sheet import renamed |
| `CONTEXT.md` | Sharpen the **Double Feed** definition |
| `AGENTS.md` | Record that `log_feed` is the only write path for a feed log |

---

### Task 1: `private.slot_states` accepts a hypothetical log

**Files:**
- Create: `supabase/migrations/20260726090000_slot_states_hypothetical.sql`
- Reference (do not edit): `supabase/migrations/20260725090600_fix_slot_states_dst_and_determinism.sql`

**Interfaces:**
- Produces: `private.slot_states(target_pet_id uuid, target_date date, hypothetical_at timestamptz default null)` returning the previous eight columns plus `hypothetical_in_window boolean`. `public.pet_slot_states(uuid, date)` keeps its exact previous signature and eight-column shape.

**Why a drop and recreate:** `create or replace function` cannot add a parameter. It creates an *overload*, and an overload whose extra parameter has a default makes every existing two-argument call ambiguous (42725). Dropping a function also drops its grants, so the grants and revokes from `20260725090600` must be re-applied in this migration.

- [ ] **Step 1: Read the function being replaced**

Read `supabase/migrations/20260725090600_fix_slot_states_dst_and_determinism.sql` end to end. The recreated body below preserves its DST fix (`next_day_start` recomputed with `at time zone`) and its determinism fix (`logs.log_id asc` as the final tiebreak). Do not drop either.

- [ ] **Step 2: Write the migration file**

Create `supabase/migrations/20260726090000_slot_states_hypothetical.sql`:

```sql
-- private.slot_states gains a third parameter: a hypothetical log timestamp,
-- so public.log_feed can ask "what would the assignment look like if this feed
-- existed?" without writing it. ADR 0009 puts every piece of Grace Window
-- arithmetic in this one function, so the question is answered here rather
-- than recomputed by the caller.
--
-- `create or replace function` cannot add a parameter -- it creates an
-- overload, and an overload whose extra parameter has a default makes every
-- existing two-argument call ambiguous (42725). Both functions are therefore
-- dropped and recreated at the new arity, and the grants and revokes from
-- 20260725090600 are re-applied: dropping a function drops its grants with it.
--
-- Two changes beyond the signature:
--
-- 1. `state` now reads the assignment map directly (`assignment ? slot_id`)
--    instead of testing the left join for a non-null id. Identical for real
--    logs -- an assigned id always joins -- but the hypothetical log has no
--    row in feed_logs, so the join cannot see it and a slot it claims would
--    otherwise report `due`/`missed` rather than `fed`, which is the exact
--    number log_feed counts.
--
-- 2. `hypothetical_in_window`: is the hypothetical timestamp inside THIS
--    slot's Grace Window? Null when no hypothetical is passed. log_feed needs
--    this to tell a snack (outside every window -- never warn) from a genuine
--    double feed whose nearby slots were all claimed by closer logs. Deriving
--    it here is what keeps `slot_at +/- grace` written once.
--
-- public.pet_slot_states keeps its two-argument signature and now names its
-- columns explicitly instead of `s.*`. The hypothetical is an internal concept
-- of the Double Feed guard; the PostgREST-exposed wrapper has no business
-- offering it, and an explicit list means adding a column in `private` can
-- never silently widen the public API.
--
-- Known limitation, deliberately not solved here: log_feed evaluates the local
-- day the log falls in. A Grace Window that crosses local midnight (a slot at
-- 00:30 with a 60-minute window, against a log at 23:50 the day before) is not
-- consulted from the adjacent day. Sweeping three days would double-count logs
-- assignable in two of them and buy accuracy no scheduled feed time in this
-- product has yet needed.

drop function if exists public.pet_slot_states(uuid, date);
drop function if exists private.slot_states(uuid, date);

create function private.slot_states(
  target_pet_id uuid,
  target_date date,
  hypothetical_at timestamptz default null
)
returns table (
  schedule_id            uuid,
  scheduled_time         time,
  label                  public.feeding_schedule_label,
  scheduled_at           timestamptz,
  state                  text,
  satisfying_log_id      uuid,
  satisfied_at           timestamptz,
  satisfied_by           uuid,
  hypothetical_in_window boolean
)
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  household_timezone text;
  grace interval;
  day_start timestamptz;
  next_day_start timestamptz;
  -- The hypothetical log's stand-in id. It never escapes to a caller:
  -- log_feed reads satisfying_log_id only from the run WITHOUT a hypothetical,
  -- and the public wrapper cannot pass one at all.
  hypothetical_log_id constant uuid := '00000000-0000-0000-0000-000000000001';
  -- schedule_id (text) -> log_id (text)
  assignment jsonb := '{}'::jsonb;
  -- the log ids already claimed by some slot
  claimed_logs jsonb := '[]'::jsonb;
  pair record;
begin
  -- All window arithmetic resolves in the household's timezone: Scheduled
  -- Times are wall-clock times with no date of their own.
  select households.timezone, make_interval(mins => households.grace_window_minutes)
    into household_timezone, grace
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if household_timezone is null then
    return;
  end if;

  day_start := target_date::timestamp at time zone household_timezone;
  -- A local day is not always 24 hours (DST fall-back/spring-forward), so the
  -- next local midnight has to be resolved with `at time zone` again rather
  -- than by adding interval '1 day' to the already-resolved `day_start`.
  next_day_start := (target_date + 1)::timestamp at time zone household_timezone;

  -- Greedy global assignment. Nearest pair first; skip a pair if either side
  -- is already taken. Ties break toward the earlier slot, then the earlier
  -- log; if two logs sit at the exact same instant equidistant from the same
  -- slot, the log id is the final tiebreak, so the result never depends on
  -- physical row order.
  for pair in
    with slots as (
      select
        feeding_schedules.id as slot_id,
        ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
      from public.feeding_schedules
      where feeding_schedules.pet_id = target_pet_id
    ),
    logs as (
      select feed_logs.id as log_id, feed_logs.logged_at as log_at
      from public.feed_logs
      where feed_logs.pet_id = target_pet_id
        and feed_logs.logged_at >= day_start - grace
        and feed_logs.logged_at < next_day_start + grace
      union all
      -- The hypothetical competes on exactly the same terms as a real log: it
      -- can claim a slot, and it can lose one to a closer log.
      select hypothetical_log_id, hypothetical_at
      where hypothetical_at is not null
    )
    select
      slots.slot_id,
      slots.slot_at,
      logs.log_id,
      logs.log_at,
      abs(extract(epoch from (logs.log_at - slots.slot_at))) as distance_seconds
    from slots
    join logs on logs.log_at between slots.slot_at - grace and slots.slot_at + grace
    order by distance_seconds asc, slots.slot_at asc, logs.log_at asc, logs.log_id asc
  loop
    if (assignment ? pair.slot_id::text) or (claimed_logs ? pair.log_id::text) then
      continue;
    end if;

    assignment := assignment || jsonb_build_object(pair.slot_id::text, pair.log_id::text);
    claimed_logs := claimed_logs || to_jsonb(pair.log_id::text);
  end loop;

  -- `state` is returned by the function rather than derived client-side:
  -- deciding `missed` means comparing now() against scheduled_at + grace,
  -- which is the window arithmetic ADR 0009 forbids reimplementing in
  -- TypeScript.
  return query
  with slots as (
    select
      feeding_schedules.id as slot_id,
      feeding_schedules.scheduled_time as slot_time,
      feeding_schedules.label as slot_label,
      ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
    from public.feeding_schedules
    where feeding_schedules.pet_id = target_pet_id
  )
  select
    slots.slot_id,
    slots.slot_time,
    slots.slot_label,
    slots.slot_at,
    case
      -- Reads the map, not the join: the hypothetical has no feed_logs row.
      when assignment ? slots.slot_id::text then 'fed'
      when now() < slots.slot_at - grace then 'upcoming'
      when now() <= slots.slot_at + grace then 'due'
      else 'missed'
    end,
    (assignment ->> slots.slot_id::text)::uuid,
    matched.logged_at,
    matched.logged_by,
    case
      when hypothetical_at is null then null::boolean
      else hypothetical_at between slots.slot_at - grace and slots.slot_at + grace
    end
  from slots
  left join public.feed_logs as matched
    on matched.id = (assignment ->> slots.slot_id::text)::uuid
  order by slots.slot_at asc;
end;
$$;

-- The wrapper is `security invoker`, NOT definer, so the selects inside run as
-- the calling user and the existing RLS on feed_logs and feeding_schedules
-- applies unchanged. A definer wrapper would expose any household's feeding
-- history to any authenticated user.

create function public.pet_slot_states(target_pet_id uuid, target_date date)
returns table (
  schedule_id       uuid,
  scheduled_time    time,
  label             public.feeding_schedule_label,
  scheduled_at      timestamptz,
  state             text,
  satisfying_log_id uuid,
  satisfied_at      timestamptz,
  satisfied_by      uuid
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    s.schedule_id,
    s.scheduled_time,
    s.label,
    s.scheduled_at,
    s.state,
    s.satisfying_log_id,
    s.satisfied_at,
    s.satisfied_by
  from private.slot_states(target_pet_id, target_date) as s;
$$;

-- Re-applied from 20260725090600: dropping a function drops its grants, and
-- every new function in `private` is born with the default PUBLIC EXECUTE that
-- migration explicitly revoked.
grant usage on schema private to authenticated, service_role;
grant execute on function private.slot_states(uuid, date, timestamptz) to authenticated, service_role;
grant execute on function public.pet_slot_states(uuid, date) to authenticated, service_role;

revoke execute on function public.pet_slot_states(uuid, date) from public, anon;
revoke execute on function private.slot_states(uuid, date, timestamptz) from public;
```

- [ ] **Step 3: Capture the current output before applying anything**

This is the before-image the next step is compared against. Use the Supabase MCP `execute_sql` on project `dofjrttcyjtzvqyttqdo`:

```sql
select p.id as pet_id, h.timezone, h.grace_window_minutes
from public.pets p
join public.households h on h.id = p.household_id;
```

Record the `pet_id` — every later verification query needs it. Then, substituting it:

```sql
select schedule_id, scheduled_time, label, state, satisfying_log_id
from public.pet_slot_states('<PET_ID>', current_date)
order by scheduled_time;
```

Save the result. Repeat for each distinct `logged_at::date` among the existing logs:

```sql
select distinct (logged_at at time zone '<TIMEZONE>')::date as local_day
from public.feed_logs where pet_id = '<PET_ID>' order by local_day;
```

- [ ] **Step 4: Apply the migration**

Use the Supabase MCP `apply_migration` with `project_id: dofjrttcyjtzvqyttqdo`, `name: slot_states_hypothetical`, and the full file contents as `query`.

Expected: success. If it fails with `cannot drop function ... because other objects depend on it`, the wrapper drop was skipped or reordered — `public.pet_slot_states` must be dropped first.

- [ ] **Step 5: Verify the two-argument path is byte-identical**

Re-run every query from Step 3. Expected: identical rows, identical `state` values, identical `satisfying_log_id` values. Any difference means the assignment changed, which this migration must not do — stop and diff the function body against `20260725090600` before continuing.

Confirm the wrapper still returns exactly eight columns:

```sql
select count(*) as column_count
from information_schema.columns
where table_schema = 'public' and table_name = 'pet_slot_states';
```

Expected: `8`. (This reads the function's OUT parameters as a table-like entry; if it returns `0`, list them instead with `select unnest(proargnames) from pg_proc where proname = 'pet_slot_states'` and confirm `hypothetical_in_window` is absent.)

- [ ] **Step 6: Verify the hypothetical claims a slot**

Pick a slot from Step 3 that is currently **unfed**, and pass its exact scheduled time as the hypothetical:

```sql
select schedule_id, state, satisfying_log_id, hypothetical_in_window
from private.slot_states('<PET_ID>', current_date, (
  select scheduled_at from private.slot_states('<PET_ID>', current_date)
  where state <> 'fed' limit 1
))
order by scheduled_at;
```

Expected: that slot's `state` is now `fed`, its `satisfying_log_id` is `00000000-0000-0000-0000-000000000001`, and its `hypothetical_in_window` is `true`. Every other slot keeps the state it had in Step 3, and its `hypothetical_in_window` is `true` only if the hypothetical falls inside its window too.

- [ ] **Step 7: Verify a far-away hypothetical is inside no window**

```sql
select bool_or(hypothetical_in_window) as any_window
from private.slot_states('<PET_ID>', current_date,
  (current_date + time '03:33') at time zone '<TIMEZONE>');
```

Expected: `false` (assuming no slot within the Grace Window of 03:33 — check against Step 3's scheduled times and pick another dead hour if 03:33 is close to one). This is the snack case: outside every window, so it can never warn.

- [ ] **Step 8: Verify anon is still denied**

```sql
select has_function_privilege('anon', 'public.pet_slot_states(uuid, date)', 'execute') as anon_can_execute,
       has_function_privilege('authenticated', 'public.pet_slot_states(uuid, date)', 'execute') as auth_can_execute,
       has_function_privilege('authenticated', 'private.slot_states(uuid, date, timestamptz)', 'execute') as auth_private;
```

Expected: `false`, `true`, `true`.

- [ ] **Step 9: Spellcheck and commit**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run spellcheck
git add supabase/migrations/20260726090000_slot_states_hypothetical.sql
git commit -m "$(cat <<'EOF'
feat: let slot_states evaluate a hypothetical feed log

Adds a third parameter carrying a hypothetical timestamp and a
hypothetical_in_window column, so the Double Feed guard can ask what the
assignment would look like without writing anything. `create or replace`
cannot add a parameter, so both functions are dropped and recreated and
the grants from 20260725090600 are re-applied.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The `log_feed` RPC

**Files:**
- Create: `supabase/migrations/20260726090100_log_feed_rpc.sql`

**Interfaces:**
- Consumes: `private.slot_states(uuid, date, timestamptz)` and its `hypothetical_in_window` column from Task 1.
- Produces: `public.log_feed(target_pet_id uuid, target_logged_at timestamptz default now(), target_notes text default null, confirmed boolean default false) returns jsonb`, returning either `{"status":"logged","log_id":"…"}` or `{"status":"double_feed","slot":{"label":…,"scheduled_time":…},"existing":{"id":…,"logged_at":…,"logged_by":…}}`.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260726090100_log_feed_rpc.sql`:

```sql
-- The one write path for a feed log. The client no longer inserts into
-- feed_logs directly, which makes the narrow column grants from
-- 20260725090300 moot rather than weakened -- the payload names no columns at
-- all.
--
-- The Double Feed check runs INSIDE the write, not before it. Check-then-
-- insert as two round trips was rejected: two people in one house both feeding
-- the dog at 6pm is not a hypothetical for this product -- it is the scenario
-- the feature exists for -- and a check that completes a full round trip
-- before its own insert can tell both of them "no double feed" and let both of
-- them write.
--
-- security invoker, so RLS remains the real gate. The feed_logs INSERT policy,
-- including the Contributor backdating floor and the Owner exemption, applies
-- unchanged, and a caller who is not a member of the pet's household cannot
-- even read the pet row that this function starts from.

create or replace function public.log_feed(
  target_pet_id uuid,
  target_logged_at timestamptz default now(),
  target_notes text default null,
  confirmed boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  household_timezone text;
  target_day date;
  is_double boolean;
  collision_label public.feeding_schedule_label;
  collision_time time;
  collision_log_id uuid;
  existing_log public.feed_logs%rowtype;
  new_log_id uuid;
begin
  select households.timezone into household_timezone
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  -- Not "pet does not exist" -- RLS on pets means a non-member reads no row,
  -- so the two cases are indistinguishable from here and must stay that way.
  if household_timezone is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  -- The local day the log falls in. See the limitation noted in
  -- 20260726090000: a Grace Window crossing local midnight is not consulted
  -- from the adjacent day.
  target_day := (target_logged_at at time zone household_timezone)::date;

  -- Logging at time T is a Double Feed if T falls inside at least one Grace
  -- Window AND adding it does not increase the number of satisfied slots that
  -- day. Both clauses are load-bearing: the first exempts snacks (a 3pm treat
  -- belongs to no slot and must never warn), the second is the actual test.
  --
  -- `<=` rather than `=`: a hypothetical can displace an existing log that
  -- then finds no other slot, which lowers the count. That is still a double
  -- feed -- the pet was fed at 6 and is about to be fed again.
  --
  -- Both CTEs are materialized so each runs the assignment exactly once
  -- despite being referenced twice.
  with without_hypothetical as materialized (
    select * from private.slot_states(target_pet_id, target_day)
  ),
  with_hypothetical as materialized (
    select * from private.slot_states(target_pet_id, target_day, target_logged_at)
  ),
  counts as (
    select
      (select count(*) from without_hypothetical where state = 'fed') as satisfied_without,
      (select count(*) from with_hypothetical where state = 'fed') as satisfied_with,
      (select coalesce(bool_or(hypothetical_in_window), false) from with_hypothetical) as in_window
  ),
  -- The slot to name in the warning: the nearest slot whose window contains T
  -- and which a REAL log already satisfies. Read from the run without the
  -- hypothetical on purpose -- in the displacement case the hypothetical has
  -- taken the slot in the other run, and the log it displaced is exactly the
  -- one the user needs to be told about.
  collision as (
    select w.label, w.scheduled_time, b.satisfying_log_id
    from with_hypothetical w
    join without_hypothetical b on b.schedule_id = w.schedule_id
    where w.hypothetical_in_window and b.state = 'fed'
    order by abs(extract(epoch from (target_logged_at - w.scheduled_at))) asc
    limit 1
  )
  select
    counts.in_window and counts.satisfied_with <= counts.satisfied_without,
    collision.label,
    collision.scheduled_time,
    collision.satisfying_log_id
  into is_double, collision_label, collision_time, collision_log_id
  from counts left join collision on true;

  -- A warning with nothing to point at is worse than no warning: it accuses
  -- the user of repeating a feed it cannot show them. Write instead.
  if is_double and collision_log_id is not null and not confirmed then
    select * into existing_log from public.feed_logs where id = collision_log_id;

    return jsonb_build_object(
      'status', 'double_feed',
      'slot', jsonb_build_object(
        'label', collision_label,
        'scheduled_time', collision_time
      ),
      'existing', jsonb_build_object(
        'id', existing_log.id,
        'logged_at', existing_log.logged_at,
        'logged_by', existing_log.logged_by
      )
    );
  end if;

  -- Nothing above this line writes. A second call with confirmed => true
  -- reaches here unconditionally.
  insert into public.feed_logs (pet_id, logged_by, logged_at, notes)
  values (
    target_pet_id,
    (select auth.uid()),
    target_logged_at,
    nullif(btrim(target_notes), '')
  )
  returning id into new_log_id;

  return jsonb_build_object('status', 'logged', 'log_id', new_log_id);
end;
$$;

revoke execute on function public.log_feed(uuid, timestamptz, text, boolean) from public, anon;
grant execute on function public.log_feed(uuid, timestamptz, text, boolean) to authenticated;
```

- [ ] **Step 2: Apply the migration**

Supabase MCP `apply_migration`, `project_id: dofjrttcyjtzvqyttqdo`, `name: log_feed_rpc`, full file contents as `query`.

- [ ] **Step 3: Verify the grants**

```sql
select has_function_privilege('anon', 'public.log_feed(uuid, timestamptz, text, boolean)', 'execute') as anon_can,
       has_function_privilege('authenticated', 'public.log_feed(uuid, timestamptz, text, boolean)', 'execute') as auth_can;
```

Expected: `false`, `true`.

- [ ] **Step 4: Verify the derivation read-only, against the spec's worked examples**

Do **not** call `log_feed` here — it writes, and as service role it would write a junk row with `logged_by = null`. Verify the derivation it depends on instead, which is the part that can actually be wrong.

For each case, run the shape below and compute the verdict by hand:

```sql
with without_hypothetical as materialized (
  select * from private.slot_states('<PET_ID>', <DAY>)
),
with_hypothetical as materialized (
  select * from private.slot_states('<PET_ID>', <DAY>, <T>)
)
select
  (select count(*) from without_hypothetical where state = 'fed') as satisfied_without,
  (select count(*) from with_hypothetical where state = 'fed') as satisfied_with,
  (select coalesce(bool_or(hypothetical_in_window), false) from with_hypothetical) as in_window;
```

Verdict is `in_window and satisfied_with <= satisfied_without`.

The dev schedule as it stands is `lunch` 12:00, `morning` 13:00, `dinner` 17:00, with a 60-minute Grace Window — nonsense as a schedule, but it makes all three cases reachable without constructing anything, because lunch's and morning's windows overlap. Re-read it first (`select label, scheduled_time from public.feeding_schedules`) rather than trusting these times; the user may have fixed it.

All three use `<DAY>` = `date '2026-07-26'`, the day the four existing logs sit on.

1. **Snack.** `<T>` = `'2026-07-26 15:19+10'::timestamptz` — a minute after the 3:19 pm log, and outside every window (13:00 closes at 14:00, 17:00 opens at 16:00). Expected: `in_window = false` → **no warning**. This is the clause that stops a 3pm treat warning.
2. **Genuine repeat.** `<T>` = `'2026-07-26 16:30+10'::timestamptz` — inside dinner's window, which the 4:25 pm log already satisfies. Expected: `in_window = true`, `satisfied_with = satisfied_without` → **warn**.
3. **Useful second feed.** `<T>` = `'2026-07-26 12:30+10'::timestamptz` — equidistant from lunch (12:00) and morning (13:00), inside both windows. With no existing log claiming either, expected: `satisfied_with = satisfied_without + 1` → **no warning**. This is the spec's worked counter-example, and the case a naive "is the nearest slot already fed" check gets wrong.

Write all three results into the commit message so a reviewer can see what was actually checked, not just that checking happened.

- [ ] **Step 5: Verify a non-member is refused**

```sql
select has_table_privilege('authenticated', 'public.feed_logs', 'insert') as can_insert_table;
```

Expected: `false` — the table-level INSERT was revoked in `20260725090300` and only the column grant remains, which is what makes the RPC the only sane path. The RLS refusal itself is verified on device in Task 4, where a real `auth.uid()` exists.

- [ ] **Step 6: Spellcheck and commit**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run spellcheck
git add supabase/migrations/20260726090100_log_feed_rpc.sql
git commit -m "$(cat <<'EOF'
feat: add the log_feed RPC with the Double Feed guard

Decides and inserts in one transaction. A feed is a Double Feed if its
time falls inside at least one Grace Window and adding it does not raise
the number of satisfied slots that day -- both derived from the existing
greedy assignment, run twice, so no new window arithmetic exists.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Rename the correction sheet

Done before the create sheet exists, so the two similarly-named files never coexist.

**Files:**
- Rename: `src/components/bottom-sheets/feed-log-sheet.tsx` → `src/components/bottom-sheets/feed-log-detail-sheet.tsx`
- Modify: `src/app/(protected)/(tabs)/activity/index.tsx:1`

**Interfaces:**
- Produces: default export `FeedLogDetailSheet`, props unchanged: `{ sheetRef: RefObject<TrueSheet | null>; logId: string | undefined; petId: string | undefined }`.

- [ ] **Step 1: Rename with git so history follows**

```bash
git mv src/components/bottom-sheets/feed-log-sheet.tsx src/components/bottom-sheets/feed-log-detail-sheet.tsx
```

- [ ] **Step 2: Rename the component and its export**

In `src/components/bottom-sheets/feed-log-detail-sheet.tsx`, change the two occurrences of the identifier:

```tsx
const FeedLogDetailSheet = ({ sheetRef, logId, petId }: Props) => {
```

```tsx
export default FeedLogDetailSheet;
```

- [ ] **Step 3: Update the two comments that name the old file**

Both are in `src/constants/schemas/feed-log.ts`, not in the sheet itself. Line 16:

```ts
 * timezone) -- see feed-log-detail-sheet.tsx for why older logs never reach
 * this schema at all.
```

Line 61:

```ts
 * control cannot represent its date, so feed-log-detail-sheet.tsx renders that
 * date as read-only text and offers notes editing only.
```

Rewrap both comment blocks to stay inside the 100-character width. No other file names the old one — verified by grep, and the sheet's own comments refer to `feed-log.ts`, which has not moved.

- [ ] **Step 4: Update the import in Activity**

`src/app/(protected)/(tabs)/activity/index.tsx:1`:

```tsx
import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
```

And the render at line 151:

```tsx
      <FeedLogDetailSheet sheetRef={sheetRef} logId={activeLogId} petId={pet?.id} />
```

- [ ] **Step 5: Confirm no reference survives**

```bash
grep -rn "feed-log-sheet\|FeedLogSheet" src/ docs/ AGENTS.md CONTEXT.md
```

Expected: no matches in `src/`. Matches in `docs/superpowers/specs/` are historical record and must be left alone.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run typecheck && bun run lint
```

Expected: typecheck clean; lint shows the 2 known pre-existing warnings and no new ones.

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: rename feed-log-sheet to feed-log-detail-sheet

Makes room for log-feed-sheet, which creates a log rather than viewing
one. The two names differed only in word order.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Log a feed through the RPC, with the inline warning

The largest task. It replaces the instant write behind both popovers with a sheet, teaches `useLogFeed` the RPC's two-outcome result, and deletes the sheet that never had a caller.

**Files:**
- Modify: `src/hooks/use-feed-log-mutations.ts` (the `useLogFeed` export only)
- Create: `src/components/bottom-sheets/log-feed-sheet.tsx`
- Modify: `src/app/(protected)/(tabs)/home/index.tsx`
- Modify: `src/app/(protected)/(tabs)/activity/index.tsx`
- Delete: `src/components/bottom-sheets/double-feed-sheet.tsx`

**Interfaces:**
- Consumes: `public.log_feed` from Task 2.
- Produces:
  - `type LogFeedResult = { status: 'logged'; logId: string } | { status: 'double_feed'; slot: { label: FeedingScheduleLabel; scheduledTime: string }; existing: { id: string; loggedAt: string; loggedBy: string | null } }` exported from `@/hooks/use-feed-log-mutations`.
  - `useLogFeed(petId: string | undefined)` — mutation input `{ loggedAt?: string; notes?: string | null; confirmed?: boolean }`, returns `Promise<LogFeedResult>`.
  - `LogFeedSheet` — default export from `@/components/bottom-sheets/log-feed-sheet`, props `{ sheetRef: RefObject<TrueSheet | null> }`.

- [ ] **Step 1: Invoke the required skills**

`/frontend-design` and `/expo-native-ui` before writing the sheet.

- [ ] **Step 2: Rewrite `useLogFeed`**

In `src/hooks/use-feed-log-mutations.ts`, replace the whole `useLogFeed` export (and its doc comment) with:

```tsx
/**
 * The only write path for a feed log. `log_feed` decides and inserts in one
 * transaction, so two members logging the same slot at the same moment cannot
 * both be told there is no double feed -- see the migration for why
 * check-then-insert as two round trips was rejected.
 *
 * Writes are deliberately NOT optimistic. RLS can genuinely reject the insert,
 * and an optimistic row that silently rolls back is exactly the "the app said
 * the pet was fed when it wasn't" failure the product brief calls
 * trust-collapsing.
 *
 * A `double_feed` result means nothing was written. Calling again with
 * `confirmed: true` writes unconditionally.
 */
export function useLogFeed(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);

  return useMutation({
    mutationFn: async (input: {
      loggedAt?: string;
      notes?: string | null;
      confirmed?: boolean;
    }): Promise<LogFeedResult> => {
      const { data, error } = await supabase.rpc('log_feed', {
        target_pet_id: petId,
        target_logged_at: input.loggedAt ?? new Date().toISOString(),
        target_notes: input.notes ?? null,
        confirmed: input.confirmed ?? false
      });

      if (error) throw error;

      return mapLogFeedResult(data);
    },
    onSettled: invalidate
  });
}
```

Above it, add the result type and its mapper:

```tsx
export type LogFeedResult =
  | { status: 'logged'; logId: string }
  | {
      status: 'double_feed';
      slot: { label: FeedingScheduleLabel; scheduledTime: string };
      existing: { id: string; loggedAt: string; loggedBy: string | null };
    };

/**
 * The RPC returns jsonb, which supabase-js hands back as `any`. Mapped here
 * rather than cast at the call site so exactly one place knows the wire shape,
 * and an unrecognised status fails loudly instead of rendering an empty
 * warning.
 */
function mapLogFeedResult(data: unknown): LogFeedResult {
  const payload = data as {
    status?: string;
    log_id?: string;
    slot?: { label: FeedingScheduleLabel; scheduled_time: string };
    existing?: { id: string; logged_at: string; logged_by: string | null };
  };

  if (payload.status === 'logged' && payload.log_id) {
    return { status: 'logged', logId: payload.log_id };
  }

  if (payload.status === 'double_feed' && payload.slot && payload.existing) {
    return {
      status: 'double_feed',
      slot: { label: payload.slot.label, scheduledTime: payload.slot.scheduled_time },
      existing: {
        id: payload.existing.id,
        loggedAt: payload.existing.logged_at,
        loggedBy: payload.existing.logged_by
      }
    };
  }

  throw new Error('Unrecognised log_feed response');
}
```

Update the imports at the top of the file — `useAuthStore` is no longer used by this hook (the RPC reads `auth.uid()` server-side), and `FeedingScheduleLabel` is now needed:

```tsx
import { supabase } from '@/lib/supabase/client';
import type { FeedingScheduleLabel } from '@/types/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
```

Leave `useUpdateFeedLog` and `useDeleteFeedLog` exactly as they are — correction still goes through the table, under the existing column grants.

- [ ] **Step 3: Typecheck to see the call sites break**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run typecheck
```

Expected: FAIL, in `home/index.tsx` and `activity/index.tsx` — both call `logFeed.mutate({})` and expect the old `string` result. That is the change surface for Steps 5 and 6.

- [ ] **Step 4: Create the sheet**

Create `src/components/bottom-sheets/log-feed-sheet.tsx`:

```tsx
import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import {
  FEED_LOG_NOTES_MAX_LENGTH,
  feedLogNotesOnlySchema,
  type FeedLogNotesOnlyFormValues
} from '@/constants/schemas/feed-log';
import type { AppTheme } from '@/constants/theme';
import { useLogFeed, type LogFeedResult } from '@/hooks/use-feed-log-mutations';
import { useHousehold } from '@/hooks/use-household';
import { memberDisplayName, useHouseholdMembers } from '@/hooks/use-household-members';
import { usePet } from '@/hooks/use-pet';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

type Warning = Extract<LogFeedResult, { status: 'double_feed' }>;

const slotLabelText: Record<Warning['slot']['label'], string> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'scheduled'
};

/**
 * Creates a feed log. The Double Feed warning renders INLINE rather than in a
 * second sheet, for two reasons: a native sheet raised while another
 * presentation is up gets swallowed by iOS, and the warning is about the thing
 * the user is already looking at -- pushing it onto another surface would lose
 * the notes they just typed.
 */
const LogFeedSheet = ({ sheetRef }: Props) => {
  const styles = useStyles(makeStyles);
  const [warning, setWarning] = useState<Warning | null>(null);

  const { data: pet } = usePet();
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();

  const logFeed = useLogFeed(pet?.id);
  const timezone = household?.timezone;

  const form = useForm<FeedLogNotesOnlyFormValues>({
    resolver: zodResolver(feedLogNotesOnlySchema),
    defaultValues: { notes: '' },
    mode: 'onBlur'
  });

  const { control, handleSubmit, reset } = form;

  const submit = (notes: string, confirmed: boolean) => {
    logFeed.mutate(
      { notes: notes.trim().length > 0 ? notes.trim() : null, confirmed },
      {
        onSuccess: (result) => {
          if (result.status === 'double_feed') {
            // Nothing was written. The sheet stays open and the button becomes
            // "Log anyway", which re-calls with confirmed: true.
            setWarning(result);
            return;
          }

          toast.success(`Logged a feed for ${pet?.name ?? 'your pet'}`);
          void sheetRef.current?.dismiss();
        },
        onError: (error) => {
          toast.error(feedLogErrorMessage(error));
        }
      }
    );
  };

  const onSubmit = handleSubmit((values) => {
    submit(values.notes, warning !== null);
  });

  return (
    <BaseSheet
      sheetRef={sheetRef}
      detents={['auto']}
      title="Log a feed"
      onDismiss={() => {
        setWarning(null);
        reset({ notes: '' });
      }}>
      <FormProvider {...form}>
        <View style={styles.content}>
          <AppText size={14} color="textSecondary">
            {pet?.name ?? 'Your pet'} · now
          </AppText>

          {warning && timezone && (
            <View style={styles.warning}>
              <Icon name="circleAlert" size={18} color="accent" />
              <AppText size={14} style={styles.warningBody}>
                {memberDisplayName(members, warning.existing.loggedBy)} already logged the{' '}
                {slotLabelText[warning.slot.label]} feed at{' '}
                {formatScheduledTime(warning.slot.scheduledTime)}, at{' '}
                {formatTimeOfDay(warning.existing.loggedAt, timezone)}.
              </AppText>
            </View>
          )}

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInputValidated
                name="notes"
                label="Notes"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Half a scoop, plus her tablet"
                maxLength={FEED_LOG_NOTES_MAX_LENGTH}
                height={80}
              />
            )}
          />

          <MainButton
            text={warning ? 'Log anyway' : 'Log feed'}
            isLoading={logFeed.isPending}
            isDisabled={!pet?.id || logFeed.isPending}
            onPress={() => {
              void onSubmit();
            }}
          />
        </View>
      </FormProvider>
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      gap: spacing.three
    },
    warning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    warningBody: {
      flex: 1
    }
  });

export default LogFeedSheet;
```

Two details that are already verified and only need to stay true: `circleAlert` is registered in `src/constants/icon-map.ts` (used by `slot-row.tsx:26`) and `accent` is a `ThemeColor` in both palettes (`theme.ts:20` and `:32`). If either ever moves, add the icon to the map per AGENTS.md rather than importing from Lucide.

`warning.slot.scheduledTime` arrives as a Postgres `time` — `"07:00:00"` — which is exactly what `formatScheduledTime` expects. No conversion.

- [ ] **Step 5: Rewire Home**

PAW-001 already gave this screen `activeLogId`, `detailSheetRef`, a `FeedLogSheet` render and the `useRef` / `useState` / `TrueSheet` imports. Do not re-add them — read the file before editing.

Add one import:

```tsx
import LogFeedSheet from '@/components/bottom-sheets/log-feed-sheet';
```

Update the detail-sheet import to the name Task 3 gave it:

```tsx
import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
```

…and its render, near the bottom of the screen:

```tsx
      <FeedLogDetailSheet sheetRef={detailSheetRef} logId={activeLogId} petId={pet?.id} />
```

Remove `import { useLogFeed } from '@/hooks/use-feed-log-mutations';` and `import { toast } from 'sonner-native';` — the sheet owns the toast now.

Replace `const logFeed = useLogFeed(pet?.id);` with a second ref alongside the existing `detailSheetRef`:

```tsx
  const logSheetRef = useRef<TrueSheet | null>(null);
```

Replace the `ActionPopover` block with:

```tsx
      <ActionPopover
        actions={CREATE_ACTIONS}
        primaryAction={{
          label: 'Log a feed',
          isDisabled: !pet?.id,
          onPress: () => {
            void logSheetRef.current?.present();
          }
        }}
      />

      <LogFeedSheet sheetRef={logSheetRef} />
```

- [ ] **Step 6: Rewire Activity**

In `src/app/(protected)/(tabs)/activity/index.tsx`, add:

```tsx
import LogFeedSheet from '@/components/bottom-sheets/log-feed-sheet';
```

Remove `import { useLogFeed } from '@/hooks/use-feed-log-mutations';` and `import { toast } from 'sonner-native';`.

Replace `const logFeed = useLogFeed(pet?.id);` with:

```tsx
  const logSheetRef = useRef<TrueSheet | null>(null);
```

(`useRef` and the `TrueSheet` type are already imported in this file.)

Replace the `ActionPopover` block — including the now-false comment about writing directly because the sheet has no create mode — with:

```tsx
      <ActionPopover
        actions={CREATE_ACTIONS}
        primaryAction={{
          label: 'Log a feed',
          isDisabled: !pet?.id,
          onPress: () => {
            void logSheetRef.current?.present();
          }
        }}
      />

      <LogFeedSheet sheetRef={logSheetRef} />
```

- [ ] **Step 7: Delete the orphan sheet**

```bash
git rm src/components/bottom-sheets/double-feed-sheet.tsx
grep -rn "DoubleFeedSheet\|double-feed-sheet" src/
```

Expected: no matches in `src/`.

- [ ] **Step 8: Typecheck, lint, spellcheck**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all clean; lint shows only the 2 known pre-existing warnings.

- [ ] **Step 9: Measure it on device**

Follow `argent-ios-simulator-setup`, then `argent-device-interact`. **Discovery before every tap** — `describe` or `debugger-component-tree`, never coordinates read off a screenshot.

1. Launch the app, land on Home.
2. `describe` → find the `plus` trigger by its `Log a feed` / `Create` accessibility label. Tap it.
3. `describe` → find the `Log a feed` primary button. Tap it.
4. `describe` → confirm the sheet is presented: title `Log a feed`, a `Notes` field, a `Log feed` button.
5. Type a note, tap `Log feed`. `describe` → expect the sheet dismissed and a toast.
6. Tap the popover and `Log a feed` again immediately, with no note. `describe` → expect the sheet to stay open with a warning naming who fed the pet and when, and the button reading **`Log anyway`**.
7. Tap `Log anyway`. `describe` → expect dismissal and a second log.

That last pair is the whole feature. If step 6 shows a dismissed sheet instead of a warning, the RPC returned `logged` — check that the two logs land inside one Grace Window of the same slot, then re-check Task 2 Step 4's cases.

**This writes real feed logs to the dev database.** That is intended and is the only way to exercise the insert with a real `auth.uid()`. Note in the commit message how many were created, so they are distinguishable from the four pre-existing test logs that must not be deleted.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: log feeds through the log_feed RPC with a confirm step

Both popover primary actions now present a sheet with a notes field
instead of writing instantly. A double_feed response keeps the sheet
open, names who fed the pet and when, and turns the button into "Log
anyway". Deletes DoubleFeedSheet, which never had a caller.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Documentation, final verification, PR

**Files:**
- Modify: `CONTEXT.md` (the **Double Feed** entry)
- Modify: `AGENTS.md` (a note under Conventions that `log_feed` is the only write path)

- [ ] **Step 1: Sharpen the Double Feed definition**

Read `CONTEXT.md` and find the **Double Feed** entry. Replace its definition with the sharpened one, keeping the file a glossary — no implementation detail, no function names:

```markdown
**Double Feed** — a feed logged at a time that falls inside at least one Grace
Window, where recording it does not increase the number of Satisfying Feeds
that day. Two feeds for effectively the same slot. A feed outside every Grace
Window is never a Double Feed — it is a snack, and a valid recorded feed that
simply belongs to no slot.
```

Adjust the wording to match the surrounding entries' voice rather than pasting verbatim if they differ.

- [ ] **Step 2: Record the write path in AGENTS.md**

In `AGENTS.md`, under `## Conventions`, add a short subsection after `### State` (it is a data-access rule, not a styling one):

```markdown
### Writing a feed log

**A feed log is created only through the `log_feed` RPC** — never
`supabase.from('feed_logs').insert(...)`. The Double Feed check and the insert
happen in one transaction, so a check issued as its own round trip can tell two
members at once that there is no double feed and let both of them write.

`log_feed` returns either `{ status: 'logged' }` or `{ status: 'double_feed' }`,
and in the second case **nothing was written** — calling again with
`confirmed: true` writes unconditionally. Corrections and deletes still go
through the table under the narrow column grants; only creation moved.
```

- [ ] **Step 3: Full gate**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run typecheck && bun run lint && bun run spellcheck
```

Expected: typecheck clean, spellcheck 0 issues, lint showing only the 2 known pre-existing warnings. If cspell flags a new word, add it to `cspell.json` rather than disabling the rule.

- [ ] **Step 4: Check the plan against what was built**

Invoke `superpowers:verification-before-completion`. Then confirm each of these by looking, not by remembering:

- `grep -rn "from('feed_logs')" src/` returns only `use-feed-log-mutations.ts` (update, delete) and the read paths in `use-feed-log.ts` / `use-feed-logs.ts`. No insert.
- `grep -rn "double-feed-sheet\|feed-log-sheet" src/` returns nothing.
- The four pre-existing test feed logs are still present:
  ```sql
  select id, logged_at, created_at, notes from public.feed_logs order by created_at;
  ```
  Expected: the original four, plus whatever Task 4 Step 9 created on device. **Delete nothing.**

- [ ] **Step 5: Commit the docs**

```bash
git add CONTEXT.md AGENTS.md
git commit -m "$(cat <<'EOF'
docs: sharpen Double Feed and record the log_feed write path

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Open the PR**

Invoke the `create-pr` skill — it owns the PAW-nnn and PR-title conventions. Title: `[PAW-001] Add the Double Feed guard and reach the correction sheet`.

**Raise these in the PR body, because they are the reviewer's decisions and not the implementer's:**

1. **The test feed logs.** State how many rows now exist, which four predate this work, and which were created by on-device verification. They are the user's to review. This is a known blocker on the PR.
2. **The cross-midnight Grace Window limitation** from Task 1's header comment — worth appending to the spec's *Open items* if the reviewer agrees it should stay open.
3. Whether the `alerts` uniqueness should be a partial unique index is **PAW-002**, not this PR. Do not raise it here.

---

## Deliberately not built here

Named because the spec mentions them and an implementer reading it might reach for them:

- **"Everyone in the household who has feed alerts on will be notified."** The spec puts this line in the create sheet — **part 2 only**. Until notifications exist it describes a feature that does not. Do not add it.
- **ADR 0012** (the universal delivery rule and the outbox) belongs to PAW-003.
- **The `Alert` glossary entry** in CONTEXT.md is PAW-003. Only **Double Feed** is sharpened here.
- **Reaching the correction sheet and the time spinner shipped in PAW-001.** `FeedLogRow` already has a real handler, `SlotRow` already takes an optional `onPress`, and the time field is already a `mode="time"` picker. If any of that is missing, PAW-001 did not merge — stop and check the branch.
- **Step 1 of the spec's sequencing — "commit the existing ActionPopover work" — is already done**, as `59b0d7f`.

## Notes for whoever executes this

- **Tasks 1 and 2 are database changes against a live dev project.** They are not reversible by `git revert` alone — a revert of the migration file leaves the deployed function at the new arity. If Task 1 needs undoing, write a new migration that recreates the two-argument pair from `20260725090600` verbatim.
- **Task 4 is the one to slow down on.** It touches a hook, two screens, and a new sheet, and its verification is the only place the whole feature is visible.
- **`bun run lint` has 2 pre-existing warnings** unrelated to this work. Two before, two after. If the count rises, the new one is yours.
