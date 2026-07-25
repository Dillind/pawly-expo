# Feed Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Do not begin execution until Dylan has explicitly confirmed he wants implementation to start**, per his usual process (plan on Opus, implement on Sonnet via the `pawly-implementer` subagent).

**Goal:** Make logging a feed the working core of the app — a `feed_logs` table with its RLS, one shared slot-matching function in `private`, a Home screen showing today's slots and a "Log a feed" button, an Activity tab listing the household's feed history, and correction/deletion through a bottom sheet.

**Architecture:** Every "has this slot been fed?" answer comes from one Postgres function (`private.slot_states`, reached through the `security invoker` wrapper `public.pet_slot_states`) so the Home screen, each Activity day header, the double-feed warning and the future missed-feed cron cannot disagree — this is [ADR 0009](../../adr/0009-symmetric-grace-window-derived-slot-matching.md) made real. Nothing is stored about which log satisfied which slot; the match is a greedy global assignment recomputed on demand. On the client, a new `useHousehold()` hook supplies the two values almost everything else needs (`id` and `timezone`), TanStack Query owns all server state, and bottom sheets are `@lodev09/react-native-true-sheet` components presented by ref ([ADR 0010](../../adr/0010-truesheet-over-expo-router-form-sheets.md)), never routes.

**Tech Stack:** Expo SDK 57 + Expo Router (native tabs), Supabase Postgres (RLS + a `plpgsql` RPC), TanStack Query (incl. `useInfiniteQuery`), Zustand (auth only), `react-hook-form` + Zod, `dayjs` with the `utc`/`timezone` plugins, `@legendapp/list`, `sonner-native`, and one new native dependency: `@lodev09/react-native-true-sheet`.

**Source of truth:** [docs/superpowers/specs/2026-07-25-feed-logging-design.md](../specs/2026-07-25-feed-logging-design.md). Do not re-open a decision recorded there.

## Global Constraints

- **Package manager is bun.** New packages go in with `bunx expo install <package>` so the version matches SDK 57. Never `npm`/`yarn`/`pnpm`, never a raw `bun add` for an Expo-ecosystem package.
- **Node 24.** Run `nvm use` in the repo before any script. On Node 20 the cspell gate silently cannot run at all.
- **Verification gate for every task:** `nvm use && bun run typecheck && bun run lint && bun run spellcheck`. All three must pass.
- **There is no test runner in this repo.** No task in this plan runs tests, and no step may claim tests pass. Verification is the three gates above plus the named simulator QA steps.
- **Supabase project id is `dofjrttcyjtzvqyttqdo`** for every `mcp__plugin_supabase_supabase__*` call.
- **Expo SDK 57.** Before using any Expo/RN API, check https://docs.expo.dev/versions/v57.0.0/. `package.json` is the source of truth for versions.
- **Files and folders are `kebab-case`.** Path aliases: `@/*` → `src/*`. Components default-exported, hooks/utilities named-exported.
- **All user-facing copy is Australian/British English** — "Couldn't log the feed", "organise", "cancelled", "colour", "it'll show up here". No Americanisms in toasts, buttons, empty states or errors.
- **Colours only via `useTheme()`**; styles only via a module-level `makeStyles` factory + `useStyles(makeStyles)`. Never hard-code a colour string.
- **Icons only via `<Icon name="…" />`** and the allow-list in `src/constants/icon-map.ts`. `lucide-react-native` is imported in that one file and nowhere else.
- **`TrueSheet` is imported as a value only in `src/components/bottom-sheets/base-sheet.tsx`.** Everywhere else it is a `import type` for the ref.
- **No generated `database.types.ts` exists.** The Supabase client is untyped, so query rows and RPC payloads need hand-written TypeScript row types and an explicit cast — that is the existing convention, not a shortcut.
- **Prettier:** 100-char width, single quotes, **no trailing commas**, `bracketSameLine: true`.
- **Comments explain the why**, never narrate a change.

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260725090000_feed_logs.sql` | The `feed_logs` table, its index, and its four RLS policies |
| `supabase/migrations/20260725090100_slot_states.sql` | `private.slot_states` (the greedy matcher) + `public.pet_slot_states` wrapper + grants |
| `src/hooks/use-household.ts` | The signed-in user's household: `id`, `timezone`, `graceWindowMinutes`, `role` |
| `src/hooks/use-pet.ts` | The household's pet (v1: exactly one) |
| `src/hooks/use-household-members.ts` | Member id → display name, for "who fed the pet" |
| `src/lib/dates.ts` | The single place `dayjs` is extended; all timezone-aware formatting |
| `src/hooks/use-refresh-on-focus.ts` | Screen-focus refetch |
| `src/hooks/use-slot-states.ts` | `pet_slot_states` RPC per (pet, date) |
| `src/hooks/use-feed-logs.ts` | Paged Activity list + the shared row mapper |
| `src/hooks/use-feed-log.ts` | One log by id, for the deep-linked sheet |
| `src/hooks/use-feed-log-mutations.ts` | Insert / update / delete, all invalidating the same two keys |
| `src/lib/feed-log-errors.ts` | Postgres/network errors → the copy in the spec's error table |
| `src/components/bottom-sheets/base-sheet.tsx` | The only value import of `TrueSheet` |
| `src/components/bottom-sheets/double-feed-sheet.tsx` | The pre-write confirmation |
| `src/components/bottom-sheets/feed-log-sheet.tsx` | Log detail, correction and deletion |
| `src/components/core/empty-state.tsx` | Reusable empty state |
| `src/components/core/error-state.tsx` | Reusable inline error + Retry |
| `src/components/ui/slot-row.tsx` | One row of Home's "Today" list |
| `src/app/(protected)/(tabs)/home/index.tsx` | Home (replaces the placeholder) |
| `src/app/(protected)/(tabs)/activity/index.tsx` | Activity tab + `?logId=` deep link host |

---

## Task 1: Household, pet and member context hooks

Nothing in the app currently supplies a `householdId` or a `household.timezone` — `useHasHousehold` returns only a boolean. Almost every later task depends on both, so they are built first.

**Files:**
- Modify: `src/types/core.ts`
- Create: `src/hooks/use-household.ts`
- Create: `src/hooks/use-pet.ts`
- Create: `src/hooks/use-household-members.ts`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase/client`, `useAuthStore` from `@/stores/auth-store`.
- Produces:
  - Types `Household`, `Pet`, `HouseholdMember` in `@/types/core`.
  - `useHousehold(): UseQueryResult<Household>` — key `['household', userId]`.
  - `usePet(): UseQueryResult<Pet>` — key `['pet', householdId]`.
  - `useHouseholdMembers(): UseQueryResult<HouseholdMember[]>` — key `['household-members', householdId]`.
  - `memberDisplayName(members: HouseholdMember[], userId: string | null): string` exported from `use-household-members.ts`.

- [ ] **Step 1: Add the domain types**

Append to `src/types/core.ts` (keep the existing contents; this goes at the end of the file):

```ts
export type HouseholdRole = 'owner' | 'contributor';

export type Household = {
  id: string;
  timezone: string;
  graceWindowMinutes: number;
  role: HouseholdRole;
  isOwner: boolean;
};

export type Pet = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type HouseholdMember = {
  userId: string;
  role: HouseholdRole;
  firstName: string | null;
  lastName: string | null;
};
```

- [ ] **Step 2: Write `useHousehold`**

Create `src/hooks/use-household.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import type { Household } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchHousehold(userId: string): Promise<Household> {
  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (membershipError) throw membershipError;

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, timezone, grace_window_minutes')
    .eq('id', membership.household_id)
    .single();

  if (householdError) throw householdError;

  return {
    id: household.id,
    timezone: household.timezone,
    graceWindowMinutes: household.grace_window_minutes,
    role: membership.role,
    isOwner: membership.role === 'owner'
  };
}

/**
 * The household the signed-in user belongs to. Two of its fields are read
 * constantly by the feed-logging feature: `timezone` (every day boundary and
 * slot calculation resolves in it, never in device-local time) and
 * `graceWindowMinutes` (the double-feed check).
 *
 * Two round trips rather than a PostgREST embed: household_members.user_id
 * points at auth.users, so the embed graph here is not the obvious one, and
 * two explicit selects cannot be misread.
 *
 * v1 assumes one household per user, hence `.limit(1)` rather than a list.
 */
export function useHousehold() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: ['household', userId],
    queryFn: () => fetchHousehold(userId as string),
    enabled: Boolean(userId)
  });
}
```

- [ ] **Step 3: Write `usePet`**

Create `src/hooks/use-pet.ts`:

```ts
import { useHousehold } from '@/hooks/use-household';
import { supabase } from '@/lib/supabase/client';
import type { Pet } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchPet(householdId: string): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, photo_url')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    photoUrl: data.photo_url
  };
}

/**
 * The household's pet. The data model supports many pets per household; the
 * v1 UI shows the oldest one, which is the one onboarding created.
 */
export function usePet() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['pet', householdId],
    queryFn: () => fetchPet(householdId as string),
    enabled: Boolean(householdId)
  });
}
```

- [ ] **Step 4: Write `useHouseholdMembers`**

Create `src/hooks/use-household-members.ts`:

```ts
import { useHousehold } from '@/hooks/use-household';
import { supabase } from '@/lib/supabase/client';
import type { HouseholdMember } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('household_members')
    .select('user_id, role')
    .eq('household_id', householdId);

  if (membershipsError) throw membershipsError;

  const userIds = (memberships as { user_id: string; role: HouseholdMember['role'] }[]).map(
    (membership) => membership.user_id
  );

  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    (profiles as { id: string; first_name: string | null; last_name: string | null }[]).map(
      (profile) => [profile.id, profile]
    )
  );

  return (memberships as { user_id: string; role: HouseholdMember['role'] }[]).map(
    (membership) => ({
      userId: membership.user_id,
      role: membership.role,
      firstName: profileById.get(membership.user_id)?.first_name ?? null,
      lastName: profileById.get(membership.user_id)?.last_name ?? null
    })
  );
}

export function useHouseholdMembers() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['household-members', householdId],
    queryFn: () => fetchHouseholdMembers(householdId as string),
    enabled: Boolean(householdId)
  });
}

/**
 * `logged_by` is nullable with `on delete set null`, so a log can outlive its
 * author. That is deliberate — a cascade would erase a household's whole
 * feeding history the day a Contributor deletes their account.
 */
export function memberDisplayName(
  members: HouseholdMember[],
  userId: string | null | undefined
): string {
  if (!userId) return 'Removed member';

  const member = members.find((candidate) => candidate.userId === userId);
  if (!member) return 'Removed member';

  return member.firstName ?? 'Member';
}
```

- [ ] **Step 5: Verify**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/core.ts src/hooks/use-household.ts src/hooks/use-pet.ts src/hooks/use-household-members.ts
git commit -m "feat: add household, pet and member context hooks

Nothing outside onboarding read pets, and nothing at all supplied a
householdId or the household timezone — every slot calculation in the
feed-logging work resolves in that timezone, so these come first.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `feed_logs` table and its row level security

The RLS gets its own task, and its own verification step, because RLS denials are where the previous two plans lost the most time. Nothing after this task should be debugging a policy.

**Files:**
- Create: `supabase/migrations/20260725090000_feed_logs.sql`

**Interfaces:**
- Consumes: `private.is_pet_household_member(uuid)` and `private.is_pet_household_owner(uuid)` — both already exist from `20260723090000_pet_household_onboarding.sql` and are reused **unchanged**.
- Produces: table `public.feed_logs (id uuid, pet_id uuid, logged_by uuid, logged_at timestamptz, notes text, created_at timestamptz)`, index `feed_logs_pet_id_logged_at_idx`, and four RLS policies.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260725090000_feed_logs.sql`:

```sql
-- Feed logs: the core record of the app. See
-- docs/superpowers/specs/2026-07-25-feed-logging-design.md.
--
-- logged_by is nullable with `on delete set null`. A cascade would erase a
-- household's entire feeding history the day a Contributor deletes their
-- account; the cost of nullable is one render branch ("Removed member").
--
-- logged_at is separate from created_at and is the mutable one: it is what the
-- slot matcher reads and what backdating changes. created_at never moves,
-- which is what makes it the correct basis for the Contributor edit window.
--
-- No amount/portion column. Neither the brief nor the glossary calls for one;
-- notes absorbs "half scoop" until structure is actually requested.

create table public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  logged_by uuid references public.users(id) on delete set null,
  logged_at timestamptz not null default now(),
  notes text check (notes is null or length(notes) <= 280),
  created_at timestamptz not null default now()
);

create index feed_logs_pet_id_logged_at_idx on public.feed_logs (pet_id, logged_at desc);

alter table public.feed_logs enable row level security;

-- The client may only ever write logged_at and notes. Nothing in the product
-- changes a log's pet_id, logged_by or created_at, and leaving them writable
-- made three holes reachable below RLS: rewriting pet_id to plant a row in a
-- stranger's household, renewing the 24h Contributor edit window with
-- `set created_at = now()`, and fabricating attribution with
-- `set logged_by = <someone else>`. A column grant closes all three where no
-- policy edit can reopen them.
revoke all on public.feed_logs from anon;
revoke insert, update on public.feed_logs from authenticated;
grant insert (pet_id, logged_by, logged_at, notes) on public.feed_logs to authenticated;
grant update (logged_at, notes) on public.feed_logs to authenticated;

create policy "feed_logs_select" on public.feed_logs for select to authenticated
using ( private.is_pet_household_member(pet_id) );

create policy "Members can log feeds for their household's pets"
on public.feed_logs for insert to authenticated
with check (
  private.is_pet_household_member(pet_id)
  and logged_by = (select auth.uid())
  and logged_at <= now()
  and logged_at >= now() - interval '24 hours'
);

-- The membership conjunct sits in both `using` and `with check`, not only as a
-- third alternative alongside the two branches -- see the explanation below
-- this code fence for why, and why it now applies to DELETE too.
--
-- The 24h backdating floor sits inside the Contributor branch only, not over
-- the whole check: bounding it unconditionally would freeze every log once it
-- passed 24h old, contradicting "Owners unrestricted". The `logged_at <= now()`
-- ceiling stays universal for both Owners and Contributors, since a
-- future-dated log is a data-integrity problem, not an abuse question.

create policy "feed_logs_update" on public.feed_logs for update to authenticated
using (
  private.is_pet_household_member(pet_id)
  and ( private.is_pet_household_owner(pet_id)
        or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' ) )
)
with check (
  private.is_pet_household_member(pet_id)
  and ( private.is_pet_household_owner(pet_id)
        or ( logged_by = (select auth.uid())
             and created_at > now() - interval '24 hours'
             and logged_at >= now() - interval '24 hours' ) )
  and logged_at <= now()
);

create policy "feed_logs_delete" on public.feed_logs for delete to authenticated
using (
  private.is_pet_household_member(pet_id)
  and ( private.is_pet_household_owner(pet_id)
        or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' ) )
);
```

- [ ] **Step 2: Apply the migration**

Call `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "dofjrttcyjtzvqyttqdo"`, `name: "feed_logs"`, `query`: the full SQL from Step 1.

- [ ] **Step 3: Verify the table, the policies and the advisors**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "dofjrttcyjtzvqyttqdo"` and:

```sql
select
  (select relrowsecurity from pg_class where relname = 'feed_logs' and relnamespace = 'public'::regnamespace) as rls_enabled,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'feed_logs') as policy_count,
  (select count(*) from pg_indexes where schemaname = 'public' and indexname = 'feed_logs_pet_id_logged_at_idx') as index_count;
```

Expected exactly: `rls_enabled: true`, `policy_count: 4`, `index_count: 1`.

Then call `mcp__plugin_supabase_supabase__get_advisors` with `project_id: "dofjrttcyjtzvqyttqdo"`, `type: "security"`. Expected: no new finding mentioning `feed_logs`. This migration adds no `SECURITY DEFINER` function and no function in `public`, so it cannot reintroduce the exposure finding the `private_rls_helpers` migration fixed.

- [ ] **Step 4: Prove the policies actually admit a real member and reject a backdated write**

This is the step that matters. A policy catalogue count proves the policies exist; it does not prove they let the app write. Both probes below impersonate a genuine household member by switching to the `authenticated` role and setting the JWT claim that `auth.uid()` reads, then roll back — nothing is persisted.

**Probe A — a member logging right now must be admitted.** Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "dofjrttcyjtzvqyttqdo"` and:

```sql
begin;

-- Capture the claim while still running as postgres; after the role switch,
-- RLS on household_members would hide the row we need to read.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select user_id::text from public.household_members limit 1))::text,
  true
) as claims_set;

set local role authenticated;

insert into public.feed_logs (pet_id, logged_by, logged_at)
select pets.id, auth.uid(), now() from public.pets limit 1;

select count(*) as visible_rows from public.feed_logs;

rollback;
```

Expected: the insert succeeds and `visible_rows` is `1` — the member can both write the row and read it back. If this errors with `new row violates row-level security policy`, the INSERT policy is wrong and **nothing later in this plan will work**; fix it here before continuing.

**Probe B — a write backdated beyond 24 hours must be rejected.** Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "dofjrttcyjtzvqyttqdo"` and:

```sql
begin;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select user_id::text from public.household_members limit 1))::text,
  true
) as claims_set;

set local role authenticated;

insert into public.feed_logs (pet_id, logged_by, logged_at)
select pets.id, auth.uid(), now() - interval '48 hours' from public.pets limit 1;

rollback;
```

Expected: this **fails** with `new row violates row-level security policy for table "feed_logs"` (SQLSTATE `42501`). A failure here is the pass condition. If it succeeds instead, the `logged_at >= now() - interval '24 hours'` clause is missing from the INSERT policy's `with check`.

Record both outcomes by ticking this step; do not move on with either probe unexplained.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260725090000_feed_logs.sql
git commit -m "feat: add feed_logs table and its row level security

The 24-hour edit and backdating bounds live in the policies rather than a
CHECK constraint because Postgres rejects now() inside CHECK. They apply to
Owners as well as Contributors: an Owner backdating past 24 hours is exactly
the move that retroactively silences an already-pushed Missed Feed Alert.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: The slot matcher — `private.slot_states` and its public wrapper

This is the subtlest code in the feature. Read the worked example before writing the loop.

**Why the assignment is global, not per-slot.** [ADR 0009](../../adr/0009-symmetric-grace-window-derived-slot-matching.md) requires that a slot has at most one Satisfying Feed *and* that a log satisfies at most one slot. Evaluating each slot independently breaks both halves:

```
slots 07:00 and 08:00, grace window 60 minutes, a single log at 07:30

evaluated independently:  07:00 claims the log (30 minutes away)
                          08:00 claims the log (30 minutes away)  <- the same log, claimed twice

correct:                  07:00 claims the log
                          08:00 is a Missed Feed
```

**The algorithm.** Generate every (slot, log) pair that falls inside that slot's Grace Window. Order the pairs by absolute distance ascending. Walk the list, assigning greedily, skipping any pair whose slot or whose log has already been taken. A `plpgsql` loop over 2–4 slots and a handful of logs — the data is tiny and the loop is obviously correct, where a `distinct on` would constrain only one side of the pairing.

**Ties.** The example above is an exact tie: 07:30 is 30 minutes from both slots. The `order by` breaks it toward the **earlier slot** (`order by distance_seconds asc, slot_at asc, log_at asc`), so the result is deterministic rather than dependent on row order. Step 4 verifies exactly this case.

**Files:**
- Create: `supabase/migrations/20260725090100_slot_states.sql`

**Interfaces:**
- Consumes: `public.feeding_schedules`, `public.feed_logs` (Task 2), `public.pets`, `public.households`, enum `public.feeding_schedule_label`.
- Produces: `public.pet_slot_states(target_pet_id uuid, target_date date)` returning rows of `(schedule_id uuid, scheduled_time time, label public.feeding_schedule_label, scheduled_at timestamptz, state text, satisfying_log_id uuid, satisfied_at timestamptz, satisfied_by uuid)` where `state` is one of `'fed' | 'due' | 'missed' | 'upcoming'`. This is the exact shape `useSlotStates` maps in Task 6.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260725090100_slot_states.sql`:

```sql
-- Derived slot matching, per ADR 0009. One function answers "has this slot
-- been fed?" for the Home screen, every Activity day header, the double-feed
-- warning and (later) the missed-feed cron, so those four surfaces cannot
-- disagree. Nothing is stored on feed_logs about which slot a log satisfied:
-- logged_at is mutable, so any match written at insert time goes stale the
-- moment a log is backdated.
--
-- It lives in `private` because ADR 0009 requires it and because `public` is a
-- PostgREST-exposed schema. `private` is not exposed, so the app cannot call
-- it directly -- hence the thin public wrapper at the bottom of this file.

create or replace function private.slot_states(target_pet_id uuid, target_date date)
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
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  household_timezone text;
  grace interval;
  day_start timestamptz;
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

  -- Greedy global assignment. Nearest pair first; skip a pair if either side
  -- is already taken. Ties break toward the earlier slot, which is what makes
  -- a log sitting equidistant between two slots deterministic.
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
        and feed_logs.logged_at < day_start + interval '1 day' + grace
    )
    select
      slots.slot_id,
      slots.slot_at,
      logs.log_id,
      logs.log_at,
      abs(extract(epoch from (logs.log_at - slots.slot_at))) as distance_seconds
    from slots
    join logs on logs.log_at between slots.slot_at - grace and slots.slot_at + grace
    order by distance_seconds asc, slots.slot_at asc, logs.log_at asc
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
      when matched.id is not null then 'fed'
      when now() < slots.slot_at - grace then 'upcoming'
      when now() <= slots.slot_at + grace then 'due'
      else 'missed'
    end,
    matched.id,
    matched.logged_at,
    matched.logged_by
  from slots
  left join public.feed_logs as matched
    on matched.id = (assignment ->> slots.slot_id::text)::uuid
  order by slots.slot_at asc;
end;
$$;

-- The wrapper is `security invoker`, NOT definer, so the selects inside run as
-- the calling user and the existing RLS on feed_logs and feeding_schedules
-- applies unchanged. A definer wrapper would expose any household's feeding
-- history to any authenticated user. The missed-feed cron reaches the same
-- function as service role, which bypasses RLS by design.
--
-- The column list is repeated rather than shared through a composite type: a
-- named composite would have to live in `public` to appear in a `public`
-- function signature, which puts a type describing private internals into the
-- PostgREST-exposed schema for no gain.

create or replace function public.pet_slot_states(target_pet_id uuid, target_date date)
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
  select s.* from private.slot_states(target_pet_id, target_date) as s;
$$;

grant usage on schema private to authenticated, service_role;
grant execute on function private.slot_states(uuid, date) to authenticated, service_role;
grant execute on function public.pet_slot_states(uuid, date) to authenticated, service_role;
```

- [ ] **Step 2: Apply the migration**

Call `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "dofjrttcyjtzvqyttqdo"`, `name: "slot_states"`, `query`: the full SQL from Step 1.

- [ ] **Step 3: Seed the worked example**

This creates a throwaway household so the probe cannot disturb the real one. Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "dofjrttcyjtzvqyttqdo"` and:

```sql
with probe_household as (
  insert into public.households (name, timezone, grace_window_minutes)
  values ('Slot matcher probe', 'Australia/Brisbane', 60)
  returning id
),
probe_pet as (
  insert into public.pets (household_id, name)
  select id, 'Probe Pet' from probe_household
  returning id
),
probe_schedules as (
  insert into public.feeding_schedules (pet_id, scheduled_time, label)
  select probe_pet.id, slot.scheduled_time, slot.label
  from probe_pet
  cross join (values
    (time '07:00', 'morning'::public.feeding_schedule_label),
    (time '08:00', 'lunch'::public.feeding_schedule_label)
  ) as slot(scheduled_time, label)
  returning id
),
probe_log as (
  insert into public.feed_logs (pet_id, logged_at)
  select probe_pet.id, ((current_date - 1 + time '07:30') at time zone 'Australia/Brisbane')
  from probe_pet
  returning id
)
select id as probe_pet_id from probe_pet;
```

Expected: one row containing a `probe_pet_id` uuid.

- [ ] **Step 4: Run the worked example and check the tie breaks toward the earlier slot**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "dofjrttcyjtzvqyttqdo"` and:

```sql
select
  s.scheduled_time,
  s.state,
  s.satisfying_log_id is not null as has_satisfying_log
from public.pet_slot_states(
  (select id from public.pets where name = 'Probe Pet'),
  current_date - 1
) as s
order by s.scheduled_time;
```

Expected exactly two rows:

```
07:00:00 | fed    | true
08:00:00 | missed | false
```

That is the whole contract in one result: the single log at 07:30 is claimed once, by the earlier of the two equidistant slots, and the other slot is a Missed Feed rather than a second claimant. If both rows read `fed`, the loop is not skipping already-claimed logs. If the `fed` row is 08:00, the tie-break ordering is wrong.

- [ ] **Step 5: Remove the probe data**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "dofjrttcyjtzvqyttqdo"` and:

```sql
delete from public.households where name = 'Slot matcher probe';
```

Then confirm nothing is left behind:

```sql
select
  (select count(*) from public.households) as households,
  (select count(*) from public.pets) as pets,
  (select count(*) from public.feed_logs) as feed_logs;
```

Expected: `households: 1`, `pets: 1`, `feed_logs: 0` — the real household untouched, no leftover probe rows.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260725090100_slot_states.sql
git commit -m "feat: add the derived slot matcher and its public wrapper

Matching is a global greedy assignment, not a per-slot lookup: with two slots
an hour apart and one log between them, independent evaluation lets the same
log satisfy both, which violates the one-log-one-slot half of ADR 0009. Pairs
are walked nearest-first and ties break toward the earlier slot so the result
is deterministic.

The wrapper in public is security invoker, not definer — a definer wrapper
would hand any household's feeding history to any authenticated user.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Install TrueSheet, build `BaseSheet`, rebuild the dev client

`@lodev09/react-native-true-sheet` is the only new package in this plan and it ships native code. **This is not an OTA-compatible change** — the JS bundle alone will not pick it up, and the running dev client must be rebuilt before any sheet will present. Do the rebuild inside this task rather than discovering it in Task 8.

**Files:**
- Modify: `package.json`, `bun.lock` (via `bunx expo install`)
- Create: `src/components/bottom-sheets/base-sheet.tsx`
- Modify: `docs/TECH_STACK.md`

**Interfaces:**
- Produces: default-exported `BaseSheet` taking `{ sheetRef: RefObject<TrueSheet | null>; children: ReactNode; title?: string; detents?: SheetDetent[]; scrollable?: boolean; onDismiss?: () => void }`. Tasks 8–10 present sheets through `sheetRef.current?.present()` and dismiss with `sheetRef.current?.dismiss()`, both of which return promises and are therefore called as `void sheetRef.current?.present()`.

- [ ] **Step 0: Establish a working native build first**

```bash
nvm use && bun run ios
```

Expected: the app builds and launches on the simulator. **Do not proceed until it does.**

`ios/` is gitignored (`.gitignore:43`), so `bun run ios` generates the native project from config rather than building a checked-in one. If that generated project is stale or broken for any reason unrelated to this plan, the failure will appear *after* TrueSheet is installed and will look like TrueSheet caused it. Ten minutes here saves an hour of debugging the wrong thing.

If this step fails, stop and report — the failure belongs to the existing project setup, not to this task.

- [ ] **Step 1: Install the package**

```bash
nvm use && bunx expo install @lodev09/react-native-true-sheet
```

Expected: `package.json` gains `"@lodev09/react-native-true-sheet"` and `bun.lock` updates. Every peer it wants (`react-native-reanimated` ≥4, `react-native-worklets`, `@react-navigation/core` ≥7) is already present, so no follow-up install is needed. No provider component is required on native — `TrueSheetProvider` exists but is a pass-through there, so do not add it to the root layout.

- [ ] **Step 2: Write `BaseSheet`**

Create `src/components/bottom-sheets/base-sheet.tsx`:

```tsx
import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { TrueSheet, type SheetDetent } from '@lodev09/react-native-true-sheet';
import type { ReactNode, RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  children: ReactNode;
  title?: string;
  detents?: SheetDetent[];
  scrollable?: boolean;
  onDismiss?: () => void;
};

/**
 * The only file in the app that imports TrueSheet as a value (ADR 0010).
 * Everywhere else imports it as a type, for the ref.
 *
 * backgroundColor is handed to native code, so it is read from useTheme() on
 * every render. A module-scope colour constant produces a sheet that ignores
 * dark mode while the JS content inside it adapts — half the sheet themes
 * correctly, which is a particularly confusing bug to chase.
 *
 * Android caps at 3 detents, so the ['auto', 0.6, 1] default is already at the
 * platform limit.
 */
const BaseSheet = ({
  sheetRef,
  children,
  title,
  detents = ['auto', 0.6, 1],
  scrollable = false,
  onDismiss
}: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={detents}
      backgroundColor={theme.colors.background}
      cornerRadius={20}
      grabber={true}
      scrollable={scrollable}
      onDidDismiss={onDismiss}>
      <View style={styles.content}>
        {title && (
          <AppText variant="header" size={20}>
            {title}
          </AppText>
        )}
        {children}
      </View>
    </TrueSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      padding: spacing.four,
      paddingBottom: spacing.five,
      gap: spacing.three
    }
  });

export default BaseSheet;
```

- [ ] **Step 3: Flip the TECH_STACK status row**

In `docs/TECH_STACK.md`, find:

```markdown
| Sheets | `@lodev09/react-native-true-sheet` | **Planned** | Native sheets (`UISheetPresentationController` / `BottomSheetDialog`), presented imperatively via `BaseSheet`. See [ADR 0010](./adr/0010-truesheet-over-expo-router-form-sheets.md) |
```

Replace with:

```markdown
| Sheets | `@lodev09/react-native-true-sheet` | Installed | Native sheets (`UISheetPresentationController` / `BottomSheetDialog`), presented imperatively via `BaseSheet` in `src/components/bottom-sheets/`. Native dependency — adding it required a dev client rebuild. See [ADR 0010](./adr/0010-truesheet-over-expo-router-form-sheets.md) |
```

- [ ] **Step 4: Verify the gates**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass. `lodev` and `TrueSheet` and `detents` are already in `cspell.json`.

- [ ] **Step 5: Rebuild the dev client**

```bash
nvm use && bun run ios
```

This runs `expo run:ios`, which regenerates the native project, installs the new pod, builds, and launches the dev client on the simulator. Expected: a clean build and the app launching to whatever screen the auth/onboarding gates land on. A build failure here is a native linking problem, not a JS one — do not proceed to Task 8 until this builds, because no sheet can present until it does.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock src/components/bottom-sheets/base-sheet.tsx docs/TECH_STACK.md
git commit -m "feat: add TrueSheet and the themed BaseSheet wrapper

BaseSheet is the single file that imports TrueSheet as a value, so swapping or
reconfiguring the sheet primitive later is one edit (ADR 0010, same
containment rule as the Icon allow-list). backgroundColor is read from
useTheme() at render because it crosses into native code — a module-scope
colour silently breaks dark mode for the sheet chrome while its JS content
adapts.

This ships native code, so the dev client was rebuilt; it is not OTA-safe.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Dates, `isWeb`, and the two liveness mechanisms

Two distinct refresh mechanisms, both required. `useFocusEffect` does **not** fire when the app returns from the background, which is the case that matters most: the phone is in a pocket, a housemate feeds the dog, the app reopens. That case needs the `AppState` bridge. Switching between tabs needs the focus hook.

**Files:**
- Create: `src/lib/dates.ts`
- Modify: `src/utils/platform.ts`
- Modify: `src/app/_layout.tsx`
- Create: `src/hooks/use-refresh-on-focus.ts`

**Interfaces:**
- Produces:
  - `dayjs` (extended) plus `todayInTimezone(timezone)`, `yesterdayInTimezone(timezone)`, `dayInTimezone(isoTimestamp, timezone)`, `timeInTimezone(isoTimestamp, timezone)`, `formatTimeOfDay(isoTimestamp, timezone)`, `formatScheduledTime(postgresTime)`, `formatDayHeading(day, timezone)`, `composeLoggedAt(day, time, timezone)` — all from `@/lib/dates`.
  - `isWeb` from `@/utils/platform`.
  - `useRefreshOnFocus(queryKey: QueryKey)` from `@/hooks/use-refresh-on-focus`.

- [ ] **Step 1: Write the date helpers**

Create `src/lib/dates.ts`:

```ts
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// The single place dayjs is extended. utc and timezone ship with dayjs itself,
// no install needed; they rely on Intl, and this runtime already runs
// Intl.DateTimeFormat().resolvedOptions().timeZone in onboarding, which is the
// evidence the ICU data is present.
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

const DAY_FORMAT = 'YYYY-MM-DD';

/** Today's calendar day in the household's timezone, never the device's. */
export function todayInTimezone(zone: string): string {
  return dayjs().tz(zone).format(DAY_FORMAT);
}

export function yesterdayInTimezone(zone: string): string {
  return dayjs().tz(zone).subtract(1, 'day').format(DAY_FORMAT);
}

/**
 * The calendar day a timestamp belongs to, in the household's timezone. Using
 * device-local time here would land a travelling member's feeds on the wrong
 * day in Activity.
 */
export function dayInTimezone(isoTimestamp: string, zone: string): string {
  return dayjs(isoTimestamp).tz(zone).format(DAY_FORMAT);
}

/** 24-hour "HH:mm", the shape the correction form edits. */
export function timeInTimezone(isoTimestamp: string, zone: string): string {
  return dayjs(isoTimestamp).tz(zone).format('HH:mm');
}

/** Display time, e.g. "7:12 AM". */
export function formatTimeOfDay(isoTimestamp: string, zone: string): string {
  return dayjs(isoTimestamp).tz(zone).format('h:mm A');
}

/** A Postgres `time` column arrives as "07:00:00"; show it as "7:00 AM". */
export function formatScheduledTime(postgresTime: string): string {
  return dayjs(postgresTime, 'HH:mm:ss').format('h:mm A');
}

/** Activity's day headers: "Today", "Yesterday", then "23 July 2026". */
export function formatDayHeading(day: string, zone: string): string {
  if (day === todayInTimezone(zone)) return 'Today';
  if (day === yesterdayInTimezone(zone)) return 'Yesterday';

  return dayjs(day, DAY_FORMAT).format('D MMMM YYYY');
}

/**
 * Rebuilds a timestamp from the correction form's day choice and "HH:mm"
 * entry, resolved in the household's timezone. Backdating is capped at 24
 * hours, so "today or yesterday" covers every case the RLS policy admits.
 */
export function composeLoggedAt(
  day: 'today' | 'yesterday',
  time: string,
  zone: string
): string {
  const calendarDay = day === 'today' ? todayInTimezone(zone) : yesterdayInTimezone(zone);

  return dayjs.tz(`${calendarDay} ${time}`, `${DAY_FORMAT} HH:mm`, zone).toISOString();
}
```

- [ ] **Step 2: Add `isWeb`**

Replace the full contents of `src/utils/platform.ts`:

```ts
import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

export { isAndroid, isIOS, isWeb };
```

- [ ] **Step 3: Bridge `AppState` to TanStack's `focusManager`**

Modify `src/app/_layout.tsx`. Change the import lines at the top:

```tsx
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { AppState, useColorScheme, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAuthStore } from '@/stores/auth-store';
import { isWeb } from '@/utils/platform';
```

Then, inside `RootLayout`, add the effect immediately after `const colorScheme = useColorScheme();`:

```tsx
  // TanStack's documented React Native pattern. useFocusEffect does not fire
  // when the app returns from the background, which is the case that matters
  // most here: the phone is in a pocket, a housemate feeds the dog, the app
  // reopens and must not still show the slot as unfed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (!isWeb) focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);
```

Leave the rest of the file exactly as it is.

- [ ] **Step 4: Write `useRefreshOnFocus`**

Create `src/hooks/use-refresh-on-focus.ts`:

```ts
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Refetches a query key when the screen regains focus.
 *
 * refetchQueries({ stale: true }) rather than invalidateQueries: invalidation
 * ignores staleTime and would re-run every per-day slot-state RPC on every tab
 * switch, refetching day headers that have not changed.
 *
 * The key is held in a ref because call sites pass an array literal, which has
 * a new identity every render; putting it in the useCallback deps would
 * re-register the focus effect on every render.
 *
 * useFocusEffect comes from expo-router, which re-exports it — importing from
 * @react-navigation/native would make that a direct dependency.
 */
export function useRefreshOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef(queryKey);
  const firstTimeRef = useRef(true);

  useEffect(() => {
    queryKeyRef.current = queryKey;
  }, [queryKey]);

  useFocusEffect(
    useCallback(() => {
      // Skip the mount focus -- useQuery has already fetched by then.
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }

      void queryClient.refetchQueries({
        queryKey: queryKeyRef.current,
        stale: true,
        type: 'active'
      });
    }, [queryClient])
  );
}
```

- [ ] **Step 5: Verify**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dates.ts src/utils/platform.ts "src/app/_layout.tsx" src/hooks/use-refresh-on-focus.ts
git commit -m "feat: add timezone-aware date helpers and query liveness

Two mechanisms, because they cover different failures. The AppState bridge
handles the one that matters most — the app was backgrounded while someone
else fed the pet — which useFocusEffect never sees. The focus hook handles tab
switches, and refetches stale-only so a tab switch does not re-run every
per-day slot-state RPC on the Activity screen.

Every day boundary resolves in the household timezone, not the device's, or a
travelling member sees feeds land on the wrong day.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Feed log query and mutation hooks

**Files:**
- Modify: `src/types/core.ts`
- Create: `src/hooks/use-slot-states.ts`
- Create: `src/hooks/use-feed-logs.ts`
- Create: `src/hooks/use-feed-log.ts`
- Create: `src/hooks/use-feed-log-mutations.ts`
- Create: `src/lib/feed-log-errors.ts`

**Interfaces:**
- Consumes: `public.pet_slot_states` (Task 3), `public.feed_logs` (Task 2), `useAuthStore`.
- Produces:
  - Types `SlotStateValue`, `SlotState`, `FeedLogAuthor`, `FeedLog` in `@/types/core`.
  - `useSlotStates(petId: string | undefined, date: string | undefined, options?: { live?: boolean })` — key `['slot-states', petId, date]`.
  - `useFeedLogs(petId: string | undefined)` — `useInfiniteQuery`, key `['feed-logs', petId]`, `FEED_LOGS_PAGE_SIZE = 30`; `mapFeedLogRow` and `FEED_LOG_SELECT` are exported for reuse.
  - `useFeedLog(logId: string | undefined)` — key `['feed-log', logId]`.
  - `useLogFeed(petId)`, `useUpdateFeedLog(petId)`, `useDeleteFeedLog(petId)` from `@/hooks/use-feed-log-mutations`.
  - `feedLogErrorMessage(error: unknown): string` from `@/lib/feed-log-errors`.

- [ ] **Step 0: Confirm the RPC's actual column names**

This repo has no generated `database.types.ts`, so the eight `SlotState` fields below are hand-written while Task 3's SQL defines them independently. Nothing links the two. A mismatch produces `undefined` at runtime — not a type error, and not a lint error.

Run against the project:

```sql
select * from public.pet_slot_states(
  (select id from public.pets limit 1),
  current_date
);
```

Expected columns, exactly: `schedule_id`, `scheduled_time`, `label`, `scheduled_at`, `state`, `satisfying_log_id`, `satisfied_at`, `satisfied_by`.

Zero rows is a perfectly good result — the column headers are what matters here, not the data. If any name differs from the list above, **stop**: Task 3's function and this task's types have diverged, and the fix belongs in whichever of the two is wrong. Do not paper over it by renaming the TypeScript field.

- [ ] **Step 1: Add the row types**

Append to `src/types/core.ts`:

```ts
export type SlotStateValue = 'fed' | 'due' | 'missed' | 'upcoming';

export type FeedingScheduleLabel = 'morning' | 'lunch' | 'dinner' | 'custom';

export type SlotState = {
  scheduleId: string;
  /** Postgres `time`, e.g. "07:00:00". */
  scheduledTime: string;
  label: FeedingScheduleLabel;
  scheduledAt: string;
  state: SlotStateValue;
  satisfyingLogId: string | null;
  satisfiedAt: string | null;
  satisfiedBy: string | null;
};

export type FeedLogAuthor = {
  firstName: string | null;
  lastName: string | null;
};

export type FeedLog = {
  id: string;
  petId: string;
  loggedBy: string | null;
  loggedAt: string;
  notes: string | null;
  createdAt: string;
  author: FeedLogAuthor | null;
};
```

- [ ] **Step 2: Write `useSlotStates`**

Create `src/hooks/use-slot-states.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import type { FeedingScheduleLabel, SlotState, SlotStateValue } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

const LIVE_REFETCH_MS = 60_000;

type SlotStateRow = {
  schedule_id: string;
  scheduled_time: string;
  label: FeedingScheduleLabel;
  scheduled_at: string;
  state: SlotStateValue;
  satisfying_log_id: string | null;
  satisfied_at: string | null;
  satisfied_by: string | null;
};

async function fetchSlotStates(petId: string, date: string): Promise<SlotState[]> {
  const { data, error } = await supabase.rpc('pet_slot_states', {
    target_pet_id: petId,
    target_date: date
  });

  if (error) throw error;

  return (data as SlotStateRow[]).map((row) => ({
    scheduleId: row.schedule_id,
    scheduledTime: row.scheduled_time,
    label: row.label,
    scheduledAt: row.scheduled_at,
    state: row.state,
    satisfyingLogId: row.satisfying_log_id,
    satisfiedAt: row.satisfied_at,
    satisfiedBy: row.satisfied_by
  }));
}

/**
 * `date` is an ISO YYYY-MM-DD string in the household's timezone — never a
 * Date, which re-serialises every render and thrashes the cache key.
 *
 * `live` is for today only. `state` is computed server-side at fetch time, so
 * a slot sitting at `due` would otherwise flip to `missed` with nothing
 * telling the client. A few rows once a minute while Home is focused is
 * cheaper than a client-side clock re-deriving a boundary ADR 0009 says it is
 * not allowed to know.
 */
export function useSlotStates(
  petId: string | undefined,
  date: string | undefined,
  options?: { live?: boolean }
) {
  return useQuery({
    queryKey: ['slot-states', petId, date],
    queryFn: () => fetchSlotStates(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date),
    refetchInterval: options?.live ? LIVE_REFETCH_MS : false
  });
}
```

- [ ] **Step 3: Write `useFeedLogs`**

Create `src/hooks/use-feed-logs.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import type { FeedLog } from '@/types/core';
import { useInfiniteQuery } from '@tanstack/react-query';

export const FEED_LOGS_PAGE_SIZE = 30;

// feed_logs.logged_by references public.users, so PostgREST can embed the
// author directly. It is null when the author deleted their account.
export const FEED_LOG_SELECT =
  'id, pet_id, logged_by, logged_at, notes, created_at, users(first_name, last_name)';

export type FeedLogRow = {
  id: string;
  pet_id: string;
  logged_by: string | null;
  logged_at: string;
  notes: string | null;
  created_at: string;
  users: { first_name: string | null; last_name: string | null } | null;
};

export function mapFeedLogRow(row: FeedLogRow): FeedLog {
  return {
    id: row.id,
    petId: row.pet_id,
    loggedBy: row.logged_by,
    loggedAt: row.logged_at,
    notes: row.notes,
    createdAt: row.created_at,
    author: row.users
      ? { firstName: row.users.first_name, lastName: row.users.last_name }
      : null
  };
}

async function fetchFeedLogsPage(petId: string, cursor: string | null): Promise<FeedLog[]> {
  let query = supabase
    .from('feed_logs')
    .select(FEED_LOG_SELECT)
    .eq('pet_id', petId)
    .order('logged_at', { ascending: false })
    .limit(FEED_LOGS_PAGE_SIZE);

  if (cursor) query = query.lt('logged_at', cursor);

  const { data, error } = await query;

  if (error) throw error;

  return (data as FeedLogRow[]).map(mapFeedLogRow);
}

/** Activity's list. Cursor on `logged_at desc`, 30 per page. */
export function useFeedLogs(petId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['feed-logs', petId],
    queryFn: ({ pageParam }) => fetchFeedLogsPage(petId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length === FEED_LOGS_PAGE_SIZE ? lastPage[lastPage.length - 1].loggedAt : null,
    enabled: Boolean(petId)
  });
}
```

- [ ] **Step 4: Write `useFeedLog`**

Create `src/hooks/use-feed-log.ts`:

```ts
import { FEED_LOG_SELECT, mapFeedLogRow, type FeedLogRow } from '@/hooks/use-feed-logs';
import { supabase } from '@/lib/supabase/client';
import type { FeedLog } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchFeedLog(logId: string): Promise<FeedLog> {
  const { data, error } = await supabase
    .from('feed_logs')
    .select(FEED_LOG_SELECT)
    .eq('id', logId)
    .single();

  if (error) throw error;

  return mapFeedLogRow(data as FeedLogRow);
}

/**
 * One log, fetched directly by id. A notification tapped three weeks later
 * points at a log nowhere near page 1, so the deep-linked sheet must not read
 * from the paged list — paging until found is unbounded.
 */
export function useFeedLog(logId: string | undefined) {
  return useQuery({
    queryKey: ['feed-log', logId],
    queryFn: () => fetchFeedLog(logId as string),
    enabled: Boolean(logId)
  });
}
```

- [ ] **Step 5: Write the error mapper**

Create `src/lib/feed-log-errors.ts`:

```ts
type SupabaseLikeError = {
  message?: string;
  code?: string;
};

/**
 * Turns a Postgres or network failure into the copy the user should see.
 * supabase-js rejects with a PostgrestError object, not an Error instance, so
 * this reads the shape rather than using `instanceof`.
 */
export function feedLogErrorMessage(error: unknown): string {
  const candidate = (error ?? {}) as SupabaseLikeError;
  const message = candidate.message ?? '';
  const code = candidate.code ?? '';

  // 42501 is an RLS refusal. The only bound a household member can trip on
  // feed_logs is the 24-hour logged_at window, so name it rather than showing
  // the raw Postgres text.
  if (code === '42501' || message.includes('row-level security')) {
    return 'That time is more than 24 hours ago';
  }

  if (message.includes('Network request failed') || message.includes('Failed to fetch')) {
    return "Couldn't log the feed. Check your connection.";
  }

  if (message.length > 0) return message;

  return 'Something went wrong. Try again.';
}
```

- [ ] **Step 6: Write the mutations**

Create `src/hooks/use-feed-log-mutations.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Every mutation invalidates the same two prefixes on settle. Prefix
 * invalidation catches every cached date without enumerating them, which
 * matters because Activity holds one slot-states entry per visible day.
 */
function useInvalidateFeedData(petId: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['slot-states', petId] });
    void queryClient.invalidateQueries({ queryKey: ['feed-logs', petId] });
  }, [queryClient, petId]);
}

/**
 * Writes are deliberately NOT optimistic. RLS can genuinely reject an insert,
 * and an optimistic row that silently rolls back is exactly the "the app said
 * the pet was fed when it wasn't" failure the product brief calls
 * trust-collapsing. The toast fires on success.
 */
export function useLogFeed(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: async (input: { loggedAt?: string }): Promise<string> => {
      const { data, error } = await supabase
        .from('feed_logs')
        .insert({
          pet_id: petId,
          logged_by: userId,
          logged_at: input.loggedAt ?? new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id as string;
    },
    onSettled: invalidate
  });
}

export function useUpdateFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { logId: string; loggedAt: string; notes: string | null }) => {
      const { error } = await supabase
        .from('feed_logs')
        .update({ logged_at: input.loggedAt, notes: input.notes })
        .eq('id', input.logId);

      if (error) throw error;
    },
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['feed-log', variables.logId] });
    }
  });
}

/**
 * Hard delete — Undo and "delete this log" are the same operation. Soft
 * deletion would add `deleted_at is null` to every read path including the
 * slot matcher and the missed-feed cron; one forgotten filter and a deleted
 * feed silently satisfies a slot.
 */
export function useDeleteFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { logId: string }) => {
      const { error } = await supabase.from('feed_logs').delete().eq('id', input.logId);

      if (error) throw error;
    },
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['feed-log', variables.logId] });
    }
  });
}
```

- [ ] **Step 7: Verify**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass.

- [ ] **Step 8: Commit**

```bash
git add src/types/core.ts src/hooks/use-slot-states.ts src/hooks/use-feed-logs.ts src/hooks/use-feed-log.ts src/hooks/use-feed-log-mutations.ts src/lib/feed-log-errors.ts
git commit -m "feat: add feed log queries and mutations

Writes are not optimistic. RLS can genuinely reject an insert, and a row that
appears and then silently disappears is the precise failure that destroys
trust in a feeding app — so the toast waits for success.

Mutations invalidate by prefix so every cached day's slot states is caught
without enumerating dates, and today's slot states poll once a minute because
`due` becoming `missed` is a server-side clock decision the client is not
allowed to make.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Icons, empty state and error state

**Files:**
- Modify: `src/constants/icon-map.ts`
- Create: `src/components/core/empty-state.tsx`
- Create: `src/components/core/error-state.tsx`

**Interfaces:**
- Produces: icon keys `utensils`, `check`, `circleAlert`; default-exported `EmptyState` taking `{ icon: IconName; title: string; description?: string; action?: ReactNode }`; default-exported `ErrorState` taking `{ title?: string; description?: string; onRetry: () => void }`.

- [ ] **Step 1: Add the three icons**

The Lucide export names below were confirmed at lucide.dev and against the installed package: `Utensils`, `Check`, `CircleAlert` all exist in `lucide-react-native@1.x`. (Note that Lucide v1 renamed `AlertCircle` to `CircleAlert` — do not use the old name.)

Replace the full contents of `src/constants/icon-map.ts`:

```ts
import {
  Asterisk,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Dot,
  Eye,
  EyeOff,
  Utensils
} from 'lucide-react-native';

export const iconMap = {
  camera: Camera,
  asterisk: Asterisk,
  caretDown: ChevronDown,
  dot: Dot,
  eye: Eye,
  eyeOff: EyeOff,
  calendar: Calendar,
  clock: Clock,
  check: Check,
  circleAlert: CircleAlert,
  utensils: Utensils
} as const;

export type IconName = keyof typeof iconMap;
```

- [ ] **Step 2: Write `EmptyState`**

Create `src/components/core/empty-state.tsx`:

```tsx
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * No `illustration` prop yet — there is no artwork to pass it. The value of
 * the component now is that when v2 art arrives it is one file to change and
 * every empty state in the app moves together.
 */
const EmptyState = ({ icon, title, description, action }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={28} color="textSecondary" />
      </View>
      <AppText size={18} fontWeight="bold" align="center">
        {title}
      </AppText>
      {description && (
        <AppText size={14} color="textSecondary" align="center">
          {description}
        </AppText>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two,
      paddingVertical: spacing.six,
      paddingHorizontal: spacing.four
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElement,
      marginBottom: spacing.two
    },
    action: {
      alignSelf: 'stretch',
      marginTop: spacing.three
    }
  });

export default EmptyState;
```

- [ ] **Step 3: Write `ErrorState`**

Create `src/components/core/error-state.tsx`:

```tsx
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  title?: string;
  description?: string;
  onRetry: () => void;
};

/**
 * Never let a failed query render as an empty list: an empty Activity and a
 * broken Activity must not look identical.
 */
const ErrorState = ({
  title = "Couldn't load this",
  description = 'Check your connection and try again.',
  onRetry
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Icon name="circleAlert" size={28} color="error" />
      <AppText size={18} fontWeight="bold" align="center">
        {title}
      </AppText>
      <AppText size={14} color="textSecondary" align="center">
        {description}
      </AppText>
      <View style={styles.action}>
        <MainButton text="Retry" variant="text" onPress={onRetry} />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two,
      paddingVertical: spacing.five,
      paddingHorizontal: spacing.four
    },
    action: {
      alignSelf: 'stretch',
      marginTop: spacing.two
    }
  });

export default ErrorState;
```

- [ ] **Step 4: Verify**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass.

- [ ] **Step 5: Commit**

```bash
git add src/constants/icon-map.ts src/components/core/empty-state.tsx src/components/core/error-state.tsx
git commit -m "feat: add empty and error states, and three icons for them

The icons go through the allow-list as always — Lucide v1 renamed AlertCircle
to CircleAlert, which is the kind of thing that becomes a bundler error rather
than a type error when guessed at the call site.

ErrorState exists so a failed query never renders as an empty list: an empty
Activity and a broken Activity must not look identical.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: The feed log Zod schema and the two sheets

**Files:**
- Create: `src/constants/schemas/feed-log.ts`
- Create: `src/components/bottom-sheets/double-feed-sheet.tsx`
- Create: `src/components/bottom-sheets/feed-log-sheet.tsx`

**Interfaces:**
- Consumes: `BaseSheet` (Task 4), the date helpers (Task 5), `useFeedLog` / `useUpdateFeedLog` / `useDeleteFeedLog` / `feedLogErrorMessage` (Task 6), `useHousehold` (Task 1).
- Produces:
  - `feedLogSchema`, `FeedLogFormValues`, `FEED_LOG_NOTES_MAX_LENGTH` from `@/constants/schemas/feed-log`.
  - Default-exported `DoubleFeedSheet` taking `{ sheetRef: RefObject<TrueSheet | null>; petName: string; onConfirm: () => void }`.
  - Default-exported `FeedLogSheet` taking `{ sheetRef: RefObject<TrueSheet | null>; logId: string | undefined; petId: string | undefined }`.

**A deliberate simplification, so it is not read as an oversight:** the correction form edits `logged_at` with a "Today / Yesterday" choice plus a masked `HH:mm` text field, not a picker. Backdating is capped at 24 hours by the RLS policy, so those two controls cover every value the database will accept. AGENTS.md says to prefer an inline picker over `react-native-modal-datetime-picker` inside a sheet — stacking a modal on a native sheet is a rough edge on iOS — and there is no inline picker component in this codebase yet. This matches the masked-time-entry precedent already set by the onboarding feeding-schedule screen. Do **not** reach for `react-native-modal-datetime-picker` here.

- [ ] **Step 1: Write the Zod schema**

Create `src/constants/schemas/feed-log.ts`:

```ts
import { z } from 'zod';

// Mirrors the `length(notes) <= 280` check on public.feed_logs. Two layers,
// one number.
export const FEED_LOG_NOTES_MAX_LENGTH = 280;

export const feedLogSchema = z.object({
  day: z.enum(['today', 'yesterday']),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Enter a valid time, like 07:30'
  }),
  notes: z.string().max(FEED_LOG_NOTES_MAX_LENGTH, {
    message: `Keep notes to ${FEED_LOG_NOTES_MAX_LENGTH} characters or fewer`
  })
});

export type FeedLogFormValues = z.infer<typeof feedLogSchema>;
```

- [ ] **Step 2: Write `DoubleFeedSheet`**

Create `src/components/bottom-sheets/double-feed-sheet.tsx`:

```tsx
import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  petName: string;
  onConfirm: () => void;
};

/**
 * Intercepts before the write, not after. The trigger is slot state alone —
 * CONTEXT.md defines a Double Feed as two feeds for effectively the same slot,
 * and warning on slot state reuses the matcher with no second rule to drift
 * from it.
 */
const DoubleFeedSheet = ({ sheetRef, petName, onConfirm }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']} title="Already fed?">
      <AppText size={14} color="textSecondary">
        Someone has already logged a feed for this slot. Log another one for {petName} anyway?
      </AppText>
      <View style={styles.actions}>
        <MainButton
          text="Feed anyway"
          onPress={() => {
            void sheetRef.current?.dismiss();
            onConfirm();
          }}
        />
        <MainButton
          text="Cancel"
          variant="text"
          onPress={() => {
            void sheetRef.current?.dismiss();
          }}
        />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    actions: {
      gap: spacing.two
    }
  });

export default DoubleFeedSheet;
```

- [ ] **Step 3: Write `FeedLogSheet`**

Create `src/components/bottom-sheets/feed-log-sheet.tsx`:

```tsx
import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import {
  FEED_LOG_NOTES_MAX_LENGTH,
  feedLogSchema,
  type FeedLogFormValues
} from '@/constants/schemas/feed-log';
import type { AppTheme } from '@/constants/theme';
import { useFeedLog } from '@/hooks/use-feed-log';
import { useDeleteFeedLog, useUpdateFeedLog } from '@/hooks/use-feed-log-mutations';
import { useHousehold } from '@/hooks/use-household';
import { useStyles } from '@/hooks/use-styles';
import {
  composeLoggedAt,
  dayInTimezone,
  dayjs,
  formatTimeOfDay,
  timeInTimezone,
  todayInTimezone
} from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useEffect, type RefObject } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  logId: string | undefined;
  petId: string | undefined;
};

const dayOptions = ['today', 'yesterday'] as const;

const FeedLogSheet = ({ sheetRef, logId, petId }: Props) => {
  const styles = useStyles(makeStyles);
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: log, isLoading } = useFeedLog(logId);
  const updateFeedLog = useUpdateFeedLog(petId);
  const deleteFeedLog = useDeleteFeedLog(petId);

  const timezone = household?.timezone;

  const form = useForm<FeedLogFormValues>({
    resolver: zodResolver(feedLogSchema),
    defaultValues: { day: 'today', time: '07:00', notes: '' },
    mode: 'onBlur'
  });

  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (!log || !timezone) return;

    reset({
      day: dayInTimezone(log.loggedAt, timezone) === todayInTimezone(timezone)
        ? 'today'
        : 'yesterday',
      time: timeInTimezone(log.loggedAt, timezone),
      notes: log.notes ?? ''
    });
  }, [log, timezone, reset]);

  // Presentation only. RLS is the actual gate; this exists so controls are not
  // offered and then rejected. The Contributor window runs from created_at,
  // not logged_at — a backdated log would otherwise be born uneditable.
  const canEdit = Boolean(
    log &&
      (household?.isOwner ||
        (log.loggedBy === userId && dayjs().diff(dayjs(log.createdAt), 'hour') < 24))
  );

  const authorName = log?.author
    ? [log.author.firstName, log.author.lastName].filter(Boolean).join(' ') || 'Member'
    : 'Removed member';

  const onSave = handleSubmit((values) => {
    if (!log || !timezone) return;

    updateFeedLog.mutate(
      {
        logId: log.id,
        loggedAt: composeLoggedAt(values.day, values.time, timezone),
        notes: values.notes.trim().length > 0 ? values.notes.trim() : null
      },
      {
        onSuccess: () => {
          toast.success('Feed updated');
          void sheetRef.current?.dismiss();
        },
        onError: (error) => {
          toast.error(feedLogErrorMessage(error));
        }
      }
    );
  });

  const onDelete = () => {
    if (!log) return;

    deleteFeedLog.mutate(
      { logId: log.id },
      {
        onSuccess: () => {
          toast.success('Feed deleted');
          void sheetRef.current?.dismiss();
        },
        onError: (error) => {
          toast.error(feedLogErrorMessage(error));
        }
      }
    );
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']} title="Feed log">
      {isLoading || !log || !timezone ? (
        <ActivityIndicator />
      ) : (
        <FormProvider {...form}>
          <AppText size={14} color="textSecondary">
            {authorName} · {formatTimeOfDay(log.loggedAt, timezone)}
          </AppText>

          {canEdit ? (
            <View style={styles.form}>
              <Controller
                control={control}
                name="day"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.dayRow}>
                    {dayOptions.map((option) => (
                      <PressableOpacity
                        key={option}
                        style={[styles.dayChip, value === option && styles.dayChipSelected]}
                        onPress={() => onChange(option)}>
                        <AppText size={14} color={value === option ? 'text' : 'textSecondary'}>
                          {option === 'today' ? 'Today' : 'Yesterday'}
                        </AppText>
                      </PressableOpacity>
                    ))}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="time"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInputValidated
                    name="time"
                    label="Time fed"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="07:30"
                    keyboardType="numbers-and-punctuation"
                  />
                )}
              />

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
                text="Save changes"
                isLoading={updateFeedLog.isPending}
                isDisabled={updateFeedLog.isPending || deleteFeedLog.isPending}
                onPress={() => {
                  void onSave();
                }}
              />
              <MainButton
                text="Delete this log"
                variant="secondary"
                isLoading={deleteFeedLog.isPending}
                isDisabled={updateFeedLog.isPending || deleteFeedLog.isPending}
                onPress={onDelete}
              />
            </View>
          ) : (
            <AppText size={16}>{log.notes ?? 'No notes on this feed.'}</AppText>
          )}
        </FormProvider>
      )}
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    form: {
      gap: spacing.three
    },
    dayRow: {
      flexDirection: 'row',
      gap: spacing.two
    },
    dayChip: {
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: 100,
      backgroundColor: colors.backgroundElement
    },
    dayChipSelected: {
      backgroundColor: colors.backgroundSelected
    }
  });

export default FeedLogSheet;
```

- [ ] **Step 4: Verify**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass. Nothing presents these sheets yet — Tasks 9 and 10 do that, and the sheets are exercised for real in Task 10's QA.

- [ ] **Step 5: Commit**

```bash
git add src/constants/schemas/feed-log.ts src/components/bottom-sheets/double-feed-sheet.tsx src/components/bottom-sheets/feed-log-sheet.tsx
git commit -m "feat: add the double-feed and feed-log sheets

The Contributor edit window is measured from created_at rather than
logged_at, so a backdated log is not born uneditable. That check is
presentation only — the RLS policy is the real gate, and this just avoids
offering a control that would then be rejected.

The correction form edits the time with a Today/Yesterday choice and a masked
HH:mm field rather than a picker: backdating is capped at 24 hours anyway, and
stacking a modal date picker on a native sheet is a known rough edge on iOS.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: The Home screen and the log flow

**Files:**
- Create: `src/components/ui/slot-row.tsx`
- Modify: `src/app/(protected)/(tabs)/home/index.tsx` (replaces the `<Text>Home</Text>` placeholder entirely)

**Interfaces:**
- Consumes: everything from Tasks 1, 5, 6, 7 and 8.
- Produces: default-exported `SlotRow` taking `{ slot: SlotState; timezone: string; fedBy: string }`; the Home screen, which is the only entry point to the log flow.

**The log flow, for reference while writing it:**

```
tap "Log a feed"
   |
   +- read the ALREADY-CACHED slot states for today (Home holds them -- no fetch)
   |  find the slot whose Grace Window contains now()
   |
   +- that slot exists AND has a satisfyingLogId
   |     +- present DoubleFeedSheet --+- "Feed anyway" -+
   |                                  +- "Cancel" -> stop
   |
   +- otherwise ------------------------------------------+
                                                          v
                                              insert into feed_logs
                                                          |
                                              toast: "Rufus fed"
                                                 [Undo] [Add note]
```

The double-feed check reads cached state on purpose. Home is the only entry point and already holds today's state; a stale cache here means at worst a missed warning, never a wrong write.

- [ ] **Step 1: Write `SlotRow`**

Create `src/components/ui/slot-row.tsx`:

```tsx
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme, ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, SlotState } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  slot: SlotState;
  timezone: string;
  fedBy: string;
};

const slotLabelText: Record<FeedingScheduleLabel, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  dinner: 'Dinner',
  custom: 'Feed'
};

const stateIcon: Record<SlotState['state'], IconName> = {
  fed: 'check',
  due: 'dot',
  missed: 'circleAlert',
  upcoming: 'dot'
};

const stateColour: Record<SlotState['state'], ThemeColor> = {
  fed: 'primary',
  due: 'accent',
  missed: 'error',
  upcoming: 'textSecondary'
};

const SlotRow = ({ slot, timezone, fedBy }: Props) => {
  const styles = useStyles(makeStyles);

  const detail =
    slot.state === 'fed' && slot.satisfiedAt
      ? `${fedBy}, ${formatTimeOfDay(slot.satisfiedAt, timezone)}`
      : { fed: 'Fed', due: 'Due now', missed: 'Missed', upcoming: 'Upcoming' }[slot.state];

  return (
    <View style={styles.row}>
      <Icon name={stateIcon[slot.state]} size={18} color={stateColour[slot.state]} />
      <AppText size={16} style={styles.label}>
        {slotLabelText[slot.label]}
      </AppText>
      <AppText size={14} color="textSecondary">
        {formatScheduledTime(slot.scheduledTime)}
      </AppText>
      <AppText size={14} color={stateColour[slot.state]} style={styles.detail} align="right">
        {detail}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    label: {
      minWidth: 72
    },
    detail: {
      flex: 1
    }
  });

export default SlotRow;
```

- [ ] **Step 2: Write the Home screen**

Replace the full contents of `src/app/(protected)/(tabs)/home/index.tsx`:

```tsx
import DoubleFeedSheet from '@/components/bottom-sheets/double-feed-sheet';
import FeedLogSheet from '@/components/bottom-sheets/feed-log-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import SlotRow from '@/components/ui/slot-row';
import type { AppTheme } from '@/constants/theme';
import { useLogFeed, useDeleteFeedLog } from '@/hooks/use-feed-log-mutations';
import { useHousehold } from '@/hooks/use-household';
import { memberDisplayName, useHouseholdMembers } from '@/hooks/use-household-members';
import { usePet } from '@/hooks/use-pet';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useSlotStates } from '@/hooks/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { dayjs, todayInTimezone } from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { hapticSuccess } from '@/lib/haptics';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const Home = () => {
  const styles = useStyles(makeStyles);

  const { data: household } = useHousehold();
  const { data: pet } = usePet();
  const { data: members = [] } = useHouseholdMembers();

  const timezone = household?.timezone;
  const today = timezone ? todayInTimezone(timezone) : undefined;

  const {
    data: slots,
    isLoading,
    isError,
    refetch
  } = useSlotStates(pet?.id, today, { live: true });

  useRefreshOnFocus(['slot-states', pet?.id]);

  const logFeed = useLogFeed(pet?.id);
  const deleteFeedLog = useDeleteFeedLog(pet?.id);

  const doubleFeedSheetRef = useRef<TrueSheet | null>(null);
  const feedLogSheetRef = useRef<TrueSheet | null>(null);
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);

  // The slot whose Grace Window contains now(), read from cache. A stale read
  // here costs at most a missed warning, never a wrong write.
  const currentSlot = useMemo(() => {
    if (!slots || !household) return undefined;

    const now = dayjs();

    return slots.find(
      (slot) =>
        Math.abs(now.diff(dayjs(slot.scheduledAt), 'minute')) <= household.graceWindowMinutes
    );
  }, [slots, household]);

  const performLog = useCallback(() => {
    logFeed.mutate(
      {},
      {
        onSuccess: (newLogId) => {
          void hapticSuccess();
          toast.success(`${pet?.name ?? 'Your pet'} fed`, {
            action: {
              label: 'Undo',
              onClick: () => deleteFeedLog.mutate({ logId: newLogId })
            },
            cancel: {
              label: 'Add note',
              onClick: () => {
                setActiveLogId(newLogId);
                void feedLogSheetRef.current?.present();
              }
            }
          });
        },
        onError: (error) => {
          toast.error(feedLogErrorMessage(error));
        }
      }
    );
  }, [logFeed, deleteFeedLog, pet?.name]);

  const onLogPress = () => {
    if (currentSlot?.satisfyingLogId) {
      void doubleFeedSheetRef.current?.present();
      return;
    }

    performLog();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="header" size={32}>
          {pet?.name ?? ' '}
        </AppText>

        <AppText size={16} color="textSecondary">
          Today
        </AppText>

        {isError ? (
          <ErrorState
            onRetry={() => {
              void refetch();
            }}
          />
        ) : isLoading || !timezone ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.slots}>
            {slots?.map((slot) => (
              <SlotRow
                key={slot.scheduleId}
                slot={slot}
                timezone={timezone}
                fedBy={memberDisplayName(members, slot.satisfiedBy)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <MainButton
          text="Log a feed"
          isLoading={logFeed.isPending}
          isDisabled={logFeed.isPending || !pet}
          onPress={onLogPress}
        />
      </View>

      <DoubleFeedSheet
        sheetRef={doubleFeedSheetRef}
        petName={pet?.name ?? 'your pet'}
        onConfirm={performLog}
      />
      <FeedLogSheet sheetRef={feedLogSheetRef} logId={activeLogId} petId={pet?.id} />
    </SafeAreaView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
    },
    slots: {
      gap: spacing.two
    },
    actions: {
      paddingHorizontal: spacing.four,
      paddingBottom: spacing.four
    }
  });

export default Home;
```

- [ ] **Step 3: Verify**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass.

- [ ] **Step 4: Manual QA on the simulator**

Run the app (`nvm use && bun run ios`) and sign in with the existing verified test account, which already has a household, a pet and three feeding schedules. Confirm:

- Home shows the pet's name, a "Today" heading and three slot rows with their scheduled times.
- Every slot reads `Upcoming`, `Due now` or `Missed` according to the current time — not all four states will be reachable in one sitting, and that is fine.
- Tapping **Log a feed** produces a `"<Pet> fed"` toast with **Undo** and **Add note** buttons, and the matching slot flips to `fed` showing the member's first name and the time.
- Tapping **Undo** on a fresh toast removes the log and the slot reverts.
- Log again, then tap **Add note** — the feed log sheet presents, with the day/time prefilled and an empty notes field. Enter a note, tap **Save changes**, and confirm the sheet dismisses with a "Feed updated" toast.
- Tap **Log a feed** a second time within the same slot: `DoubleFeedSheet` must present *before* anything is written. **Cancel** writes nothing; **Feed anyway** writes a second log.
- Confirm the sheet renders correctly in dark mode (toggle the simulator's appearance) — the sheet background must follow the theme, not stay white.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/slot-row.tsx "src/app/(protected)/(tabs)/home/index.tsx"
git commit -m "feat: replace the Home placeholder with today's slots and the log flow

The double-feed check reads the slot states Home already holds rather than
refetching: Home is the only entry point to logging, and a stale read here
costs at most a missed warning, never a wrong write.

No analytics or streaks — they would be empty in week one and the brief puts
them in v2.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: The Activity tab, the deep link, and the native-tab focus check

**Files:**
- Modify: `src/app/(protected)/(tabs)/_layout.tsx`
- Create: `src/app/(protected)/(tabs)/activity/_layout.tsx`
- Create: `src/components/ui/activity-day-header.tsx`
- Create: `src/components/ui/feed-log-row.tsx`
- Create: `src/app/(protected)/(tabs)/activity/index.tsx`
- Possibly modify: `src/hooks/use-refresh-on-focus.ts` (only if Step 7 says so)

**Interfaces:**
- Consumes: `useFeedLogs`, `useFeedLog`, `useSlotStates`, `FeedLogSheet`, `EmptyState`, `ErrorState`, the date helpers.
- Produces: the `activity` route, reachable at `/activity` and `/activity?logId=<uuid>`.

**Why Activity lists logs only.** A Missed Feed is derived, not a row. Interleaving derived entries with table rows would make pagination merge two sources per day rather than run a cursor over one table. The day header carries the count instead (`Today · Fed 2 of 3`), which keeps a missed day visible while pagination stays trivial. Each day header costs one `pet_slot_states` call — roughly ten per 30-log page.

- [ ] **Step 1: Add the Activity tab**

Replace the full contents of `src/app/(protected)/(tabs)/_layout.tsx`:

```tsx
import { useTheme } from '@/hooks/use-theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      disableTransparentOnScrollEdge={true}
      tintColor={theme.colors.textSecondary}
      minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'house.fill'} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'list.bullet'} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'person.fill'} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

Create `src/app/(protected)/(tabs)/activity/_layout.tsx` (mirrors the existing home and profile layouts):

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ActivityLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

- [ ] **Step 2: Write the day header**

Create `src/components/ui/activity-day-header.tsx`:

```tsx
import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useSlotStates } from '@/hooks/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { formatDayHeading } from '@/lib/dates';
import { StyleSheet, View } from 'react-native';

type Props = {
  day: string;
  petId: string | undefined;
  timezone: string;
};

/**
 * Missed Feeds are not rows in this list — they are a count on the day header,
 * which is what keeps pagination a cursor over one table instead of a merge of
 * two sources per day.
 */
const ActivityDayHeader = ({ day, petId, timezone }: Props) => {
  const styles = useStyles(makeStyles);
  const { data: slots } = useSlotStates(petId, day);

  const fedCount = slots?.filter((slot) => slot.state === 'fed').length ?? 0;
  const totalCount = slots?.length ?? 0;

  return (
    <View style={styles.header}>
      <AppText size={16} fontWeight="bold">
        {formatDayHeading(day, timezone)}
      </AppText>
      {totalCount > 0 && (
        <AppText size={14} color={fedCount < totalCount ? 'error' : 'textSecondary'}>
          Fed {fedCount} of {totalCount}
        </AppText>
      )}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.four,
      paddingBottom: spacing.two
    }
  });

export default ActivityDayHeader;
```

- [ ] **Step 3: Write the log row**

Create `src/components/ui/feed-log-row.tsx`:

```tsx
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatTimeOfDay } from '@/lib/dates';
import type { FeedLog } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  log: FeedLog;
  timezone: string;
  onPress: () => void;
};

const FeedLogRow = ({ log, timezone, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  const authorName = log.author
    ? [log.author.firstName, log.author.lastName].filter(Boolean).join(' ') || 'Member'
    : 'Removed member';

  return (
    <PressableOpacity style={styles.row} onPress={onPress}>
      <Icon name="utensils" size={18} color="primary" />
      <View style={styles.body}>
        <AppText size={16}>{authorName}</AppText>
        {log.notes && (
          <AppText size={14} color="textSecondary" numberOfLines={2}>
            {log.notes}
          </AppText>
        )}
      </View>
      <AppText size={14} color="textSecondary">
        {formatTimeOfDay(log.loggedAt, timezone)}
      </AppText>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: 12,
      marginBottom: spacing.two,
      backgroundColor: colors.backgroundElement
    },
    body: {
      flex: 1,
      gap: spacing.one
    }
  });

export default FeedLogRow;
```

- [ ] **Step 4: Write the Activity screen**

Create `src/app/(protected)/(tabs)/activity/index.tsx`:

```tsx
import FeedLogSheet from '@/components/bottom-sheets/feed-log-sheet';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import ActivityDayHeader from '@/components/ui/activity-day-header';
import FeedLogRow from '@/components/ui/feed-log-row';
import type { AppTheme } from '@/constants/theme';
import { useFeedLog } from '@/hooks/use-feed-log';
import { useFeedLogs } from '@/hooks/use-feed-logs';
import { useHousehold } from '@/hooks/use-household';
import { usePet } from '@/hooks/use-pet';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import { dayInTimezone } from '@/lib/dates';
import type { FeedLog } from '@/types/core';
import { LegendList } from '@legendapp/list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';

type ActivityItem =
  | { kind: 'header'; day: string }
  | { kind: 'log'; log: FeedLog };

const Activity = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHousehold();
  const { data: pet } = usePet();
  const timezone = household?.timezone;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedLogs(pet?.id);

  useRefreshOnFocus(['feed-logs', pet?.id]);

  const sheetRef = useRef<TrueSheet | null>(null);
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);

  // A sheet has no URL, so a notification routes to this screen with a param.
  // The log is fetched directly by id rather than paged for, because a
  // notification tapped three weeks later points at a log nowhere near page 1.
  const { logId } = useLocalSearchParams<{ logId?: string }>();
  const { data: deepLinkedLog } = useFeedLog(logId || undefined);

  useEffect(() => {
    if (!logId || !deepLinkedLog) return;

    setActiveLogId(deepLinkedLog.id);
    void sheetRef.current?.present();
    // Clearing the param immediately means back-navigation and a second tap on
    // the same notification both behave.
    router.setParams({ logId: '' });
  }, [logId, deepLinkedLog, router]);

  const items = useMemo<ActivityItem[]>(() => {
    if (!timezone) return [];

    const logs = data?.pages.flat() ?? [];
    const result: ActivityItem[] = [];
    let currentDay: string | null = null;

    for (const log of logs) {
      // The day boundary is the household's timezone, never the device's, or a
      // travelling member sees feeds land on the wrong day.
      const day = dayInTimezone(log.loggedAt, timezone);

      if (day !== currentDay) {
        currentDay = day;
        result.push({ kind: 'header', day });
      }

      result.push({ kind: 'log', log });
    }

    return result;
  }, [data, timezone]);

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  if (isLoading || !timezone) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LegendList
        data={items}
        keyExtractor={(item) =>
          item.kind === 'header' ? `header-${item.day}` : `log-${item.log.id}`
        }
        estimatedItemSize={72}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListEmptyComponent={
          <EmptyState
            icon="utensils"
            title="No feeds logged yet"
            description="Log the first feed and it'll show up here for everyone in the household."
            action={<MainButton text="Log a feed" href="/home" />}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator style={styles.loader} /> : null
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <ActivityDayHeader day={item.day} petId={pet?.id} timezone={timezone} />
          ) : (
            <FeedLogRow
              log={item.log}
              timezone={timezone}
              onPress={() => {
                setActiveLogId(item.log.id);
                void sheetRef.current?.present();
              }}
            />
          )
        }
      />

      <FeedLogSheet sheetRef={sheetRef} logId={activeLogId} petId={pet?.id} />
    </SafeAreaView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    listContent: {
      paddingHorizontal: spacing.four,
      paddingBottom: spacing.six
    },
    loader: {
      marginVertical: spacing.four
    }
  });

export default Activity;
```

- [ ] **Step 5: Verify**

```bash
nvm use && bun run typecheck && bun run lint && bun run spellcheck
```

Expected: all three pass. The `/home` href in the empty state's action resolves because `home/index.tsx` exists.

- [ ] **Step 6: Manual QA — the Activity screen itself**

Run the app (`nvm use && bun run ios`). Confirm:

- A third **Activity** tab appears between Home and Profile with a list icon.
- With no logs at all, Activity shows the empty state ("No feeds logged yet") and its button, **not** a blank screen.
- After logging a feed from Home, Activity shows a `Today` header reading `Fed 1 of 3` and one row with the member's name and the time.
- Tapping a row opens the feed log sheet with that log's detail and the edit controls.
- Editing the time to `Yesterday` and saving moves the row under a `Yesterday` header on the next render.
- Deleting a log from the sheet removes the row.

- [ ] **Step 7: Manual QA — does `useFocusEffect` fire on a native tab switch?**

**This is the plan's one genuinely unverified assumption.** `expo-router/unstable-native-tabs` renders UIKit-backed tabs rather than JS ones, and it has not been confirmed that a React Navigation focus event fires when switching between them. Everything cross-tab depends on it.

Run this exact sequence on the simulator:

1. Open Home. Note which slots read `fed`.
2. Switch to the Activity tab and note the row count.
3. Switch back to Home and tap **Log a feed**.
4. Switch to the Activity tab **without** force-quitting or backgrounding the app.
5. **Expected:** the new log appears at the top of the list under `Today`, and the day header count increases by one.
6. Switch back to Home. **Expected:** the matching slot now reads `fed`.
7. From Activity, open the newest log and delete it. Switch to Home. **Expected:** that slot reverts to `due`/`missed`/`upcoming`.

**If steps 5–7 all pass:** `useFocusEffect` fires on native tab switches. Tick this step, note "focus effect confirmed working on native tabs" in the commit message, and change nothing.

**If the other tab does *not* update** (it still shows the old data until you force-quit or background the app): `useFocusEffect` does not fire for native tabs. Apply the documented fallback — install the navigation package and swap the hook's mechanism for `useIsFocused()`:

```bash
nvm use && bunx expo install @react-navigation/native
```

Then replace the full contents of `src/hooks/use-refresh-on-focus.ts`:

```ts
import { useIsFocused } from '@react-navigation/native';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Refetches a query key when the screen regains focus.
 *
 * useFocusEffect from expo-router does not fire on expo-router native tab
 * switches -- those tabs are UIKit-backed rather than JS-rendered, verified on
 * the simulator. useIsFocused() does update across them, so the refetch is
 * driven from that boolean instead.
 *
 * refetchQueries({ stale: true }) rather than invalidateQueries: invalidation
 * ignores staleTime and would re-run every per-day slot-state RPC on every tab
 * switch.
 */
export function useRefreshOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const queryKeyRef = useRef(queryKey);
  const firstTimeRef = useRef(true);

  useEffect(() => {
    queryKeyRef.current = queryKey;
  }, [queryKey]);

  useEffect(() => {
    if (!isFocused) return;

    // Skip the mount focus -- useQuery has already fetched by then.
    if (firstTimeRef.current) {
      firstTimeRef.current = false;
      return;
    }

    void queryClient.refetchQueries({
      queryKey: queryKeyRef.current,
      stale: true,
      type: 'active'
    });
  }, [isFocused, queryClient]);
}
```

Then re-run steps 1–7 and confirm they now pass, plus `nvm use && bun run typecheck && bun run lint && bun run spellcheck`.

- [ ] **Step 8: Manual QA — the deep link and the background refresh**

- With the app running, open a browser or the simulator's URL handler and open `pawlyapp://activity?logId=<a real log id>` (get one with `mcp__plugin_supabase_supabase__execute_sql`: `select id from public.feed_logs order by logged_at desc limit 1;`). **Expected:** the Activity tab opens and the feed log sheet presents showing that log. Dismiss it, then navigate away and back — the sheet must **not** re-present, because the param was cleared.
- Background the app (simulator home button), then use `mcp__plugin_supabase_supabase__execute_sql` to insert a log directly:
  `insert into public.feed_logs (pet_id, logged_by, logged_at) select id, null, now() from public.pets limit 1;`
  Reopen the app. **Expected:** Home and Activity both show the new feed without a manual refresh — this is the `AppState` → `focusManager` bridge from Task 5, and it is the case `useFocusEffect` never covers.
- Clean up that probe row afterwards: `delete from public.feed_logs where logged_by is null;`

- [ ] **Step 9: Commit**

```bash
git add "src/app/(protected)/(tabs)/_layout.tsx" "src/app/(protected)/(tabs)/activity" src/components/ui/activity-day-header.tsx src/components/ui/feed-log-row.tsx src/hooks/use-refresh-on-focus.ts
git commit -m "feat: add the Activity tab, its day headers and the log deep link

Activity lists Feed Logs only. A Missed Feed is derived, not a row, so
interleaving them would make pagination merge two sources per day instead of
running a cursor over one table — the day header carries the count instead,
which keeps a missed day visible for free.

The deep-linked sheet fetches its log by id rather than reading the list: a
notification tapped three weeks later points at a log nowhere near page 1, so
paging until found is unbounded.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If Step 7 required the `useIsFocused` fallback, say so in the commit body and include `package.json`/`bun.lock` in the `git add`.)

---

## Self-Review Notes

**Spec coverage.** Data model → Task 2. RLS → Task 2 (with its own probe step). Slot matching, the wrapper, the greedy assignment and the tie rule → Task 3. Client data layer table (all eight hooks) → Tasks 1 and 6. Liveness, both mechanisms and the `isWeb` addition → Task 5. Log flow including the pre-write double-feed intercept and the non-optimistic write → Task 9. Home → Task 9. Activity, day headers, deep link, permissions in the UI → Tasks 8 and 10. Empty state → Task 7. Error handling table → `feedLogErrorMessage` (Task 6) plus `ErrorState` (Task 7). Zod notes limit → Task 8. Dependencies (`TrueSheet`, the dayjs plugins) → Tasks 4 and 5.

**Out of scope, deliberately, per the spec:** push notifications and the missed-feed cron (the next plan — this one only has to make `feed_logs` exist so that work is unblocked), Realtime, offline queueing, analytics and streaks, the invite flow, and custom empty-state artwork.

**Type consistency.** `pet_slot_states`' eight output columns match `SlotStateRow` in Task 6 field for field, and `SlotState` is consumed with the same property names in `SlotRow` (Task 9) and `ActivityDayHeader` (Task 10). `FeedLog` is produced by `mapFeedLogRow` in Task 6 and consumed unchanged in Tasks 8 and 10. The mutation input shapes (`{ loggedAt? }`, `{ logId, loggedAt, notes }`, `{ logId }`) match every call site. `RefObject<TrueSheet | null>` is the ref type in `BaseSheet`, both sheets and both screens.

**Known gap carried from the spec.** Activity costs one `pet_slot_states` call per visible day header — roughly ten per 30-log page. If that measurably degrades scrolling, the fix is a date-range variant of the function, not a client-side cache that could disagree with the server. Not addressed here.
