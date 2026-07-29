# Feed Logging — Design

**Status:** approved, not yet implemented
**Date:** 2026-07-25
**Branch:** `feat/PAW-001-feed-logging`

Logging a feed is the core action of Crumpet. This spec covers the `feed_logs` table, the shared
slot-matching function, the log and correction flows, the Activity screen, and the Home screen that
replaces the current placeholder.

Decisions already recorded elsewhere are referenced, not restated:

- [ADR 0009](../../adr/0009-symmetric-grace-window-derived-slot-matching.md) — the Grace Window is
  symmetric; slot matching is derived on demand by one function in `private`, never stored on the log.
- [ADR 0010](../../adr/0010-truesheet-over-expo-router-form-sheets.md) — sheets use
  `@lodev09/react-native-true-sheet`, not Expo Router `formSheet`.
- [CONTEXT.md](../../../CONTEXT.md) — Grace Window, Satisfying Feed, Activity, Double Feed, Missed Feed.
- [AGENTS.md](../../../AGENTS.md) — sheet, theming, form, icon and localisation conventions.

## Scope

**In:** the `feed_logs` table and its RLS, the shared slot-state function, logging a feed, correcting
and deleting a feed, the Activity screen, the Home screen, a reusable empty-state component.

**Out:** push notifications and the missed-feed cron (the next plan — this one only has to make
`feed_logs` exist so that work is unblocked), Supabase Realtime, offline queueing, analytics and
streaks, the invite flow, custom empty-state artwork.

## Decisions

Settled in design sessions and recorded here for the first time:

| Area | Decision |
|---|---|
| Contributor edit window | 24 hours from `created_at`, not `logged_at` — otherwise a backdated log is born uneditable. Owners unrestricted, and exempt from the 24h backdating floor (not the future-dating ceiling). `created_at` is unwritable below RLS via a column grant, so the window cannot be renewed. |
| Tabs | Home · Activity · Profile. Activity is a new third tab. |
| Home | Today's slots, per-slot state, log button. No analytics. |
| Log action | Instant write, then a toast offering Undo and Add note. A Double Feed intercepts with a confirm sheet *before* writing. |
| Liveness | Query invalidation plus focus refetch. Realtime deferred. |
| Deep link | Notification opens `/activity?logId=…`; the host screen presents the sheet, then clears the param. |
| Activity rows | Feed Logs only. Missed Feeds appear as a per-day header count, not as rows. |
| Deletion | Hard delete. Undo and "delete this log" are the same operation. |
| Double Feed trigger | Slot-based only, exactly as CONTEXT.md defines it. |
| Backdating | Contributors: at most 24 hours back. Owners: no floor, on both creating and editing a log. Never in the future, for anyone. |

### Why Activity lists logs only

A Missed Feed is derived, not a row. Interleaving derived entries with table rows means pagination
merges two sources per day rather than running a cursor over one table. The day header carries the
count instead (`Today · Fed 2 of 3`), which keeps a missed day visible while pagination stays trivial.

### Why hard delete

Soft deletion would add `deleted_at is null` to every read path — including inside the slot-matching
function and the missed-feed cron. One forgotten filter and a deleted feed silently satisfies a slot,
which is the exact class of bug ADR 0009 exists to prevent. A household is a handful of trusted
people and Activity is a coordination surface, not an audit log.

Accepted consequence: deleting a log reverts its slot to unfed, which can trigger a Missed Feed
Alert, and nothing records that the log existed.

### Why the Double Feed warning is slot-based only

CONTEXT.md defines Double Feed as two feeds for effectively the same slot. Warning on slot state
alone reuses the matcher with no second rule to drift from it.

Accepted gap: two unscheduled snacks minutes apart trigger no warning, because neither belongs to a
slot. A recency net (warn if any log in the last 30 minutes) was considered and rejected for v1 — it
is a second rule that the cron does not share.

### Why backdating is capped at 24 hours

Unbounded backdating lets someone retroactively satisfy a slot whose Missed Feed Alert has already
fired, so the push and the app disagree. Capping at 24 hours still covers the real case — fed at
23:00, logged at 00:10 the next day.

This reasoning holds for **Contributors only**. The floor was lifted for Owners on 2026-07-25, which
means an Owner *can* produce exactly the disagreement described above; the row-level security section
below records that decision and the consequence accepted with it. The no-future **ceiling** is not
part of this trade-off and binds everyone — it exists because a future `logged_at` breaks the slot
matcher and day grouping, which is a data-integrity problem rather than a question of trust.

## Data model

```sql
create table public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  logged_by uuid references public.users(id) on delete set null,
  logged_at timestamptz not null default now(),
  notes text check (notes is null or length(notes) <= 280),
  created_at timestamptz not null default now()
);

create index feed_logs_pet_id_logged_at_idx on public.feed_logs (pet_id, logged_at desc);
```

`logged_by` is nullable with `on delete set null`. A cascade would erase a household's entire feeding
history the day a Contributor deletes their account. The cost is one render branch — a null author
displays as "Removed member".

`logged_at` is separate from `created_at` and is the mutable one: it is what the matcher reads, and
what backdating changes. `created_at` never moves — enforced, not just asserted: the client's `update`
grant is narrowed to `(logged_at, notes)` only (see Row level security below), so `created_at` is
unwritable below RLS regardless of what any policy's `with check` allows. That immutability is what
makes it the correct, un-renewable basis for the Contributor edit window.

No `amount` or `portion` column. Neither the brief nor the glossary calls for one; `notes` absorbs
"half scoop" until structure is actually requested.

### Row level security

The 24-hour bounds live in policies rather than a `CHECK` constraint, because Postgres rejects
non-immutable functions such as `now()` inside `CHECK`. Policy expressions are evaluated per
statement and may use it.

`private.is_pet_household_member` and `private.is_pet_household_owner` already exist from the
pet/household onboarding migration and are reused unchanged.

```sql
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

-- Supabase grants every table in `public` to `authenticated` by default, which
-- includes three privileges that sit outside both the column grants above and
-- RLS. TRUNCATE is the one that matters: it bypasses row level security
-- completely, so `truncate public.feed_logs` erases every household's history
-- with no policy consulted, and the column grants are worth nothing while it
-- stands. TRIGGER is an execution surface on rows the caller cannot write;
-- REFERENCES leaks row existence through constraint violations. None is
-- reachable through PostgREST today, so this is defence in depth rather than a
-- patched hole -- the grant layer is what should hold when a policy is wrong.
revoke truncate, trigger, references on public.feed_logs from authenticated;

create policy "feed_logs_select" on public.feed_logs for select to authenticated
using ( private.is_pet_household_member(pet_id) );

-- The Owner backdating exemption covers creating a log as well as editing one.
-- Applying the floor here but not in UPDATE bought nothing: an Owner blocked
-- from creating a log dated three days ago could create one dated now and edit
-- it back arbitrarily far. All the asymmetry did was fail the honest route.
create policy "feed_logs_insert" on public.feed_logs for insert to authenticated
with check (
  private.is_pet_household_member(pet_id)
  and logged_by = (select auth.uid())
  and logged_at <= now()
  and ( private.is_pet_household_owner(pet_id)
        or logged_at >= now() - interval '24 hours' )
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

The `logged_at` **ceiling** (`logged_at <= now()`) applies to Owners too: a future-dated log is a
data-integrity problem regardless of who makes it, since it breaks the slot matcher and day grouping.
The `logged_at` **floor** (`>= now() - interval '24 hours'`) does not — it applies to the Contributor
branch only, on **both INSERT and UPDATE**: an Owner may create a backdated log outright, not merely
edit an existing one backwards. An Owner can therefore place a log arbitrarily far into the past, including past a
slot whose Missed Feed Alert has already fired, retroactively silencing an alert that has already been
pushed. This reverses the reasoning the floor was originally built on (an Owner backdating beyond 24
hours was meant to be exactly the move this bound prevented). It is a deliberate decision by the repo
owner (2026-07-25), not an oversight: Owner trust is taken to extend to backdating, and the
alert-silencing consequence is accepted.

`private.is_pet_household_member(pet_id)` is a conjunct over both UPDATE and DELETE — in `using` as
well as `with check` — not a third alternative alongside the two branches. The Contributor branch
names only `logged_by` and `created_at`, so on its own it says nothing about which household the row
belongs to. For UPDATE, without the conjunct a Contributor could log a feed on their own pet and then
rewrite `pet_id` to a pet in a household they have never belonged to, planting a row in a stranger's
feeding history. For DELETE, which has no `with check` to backstop it, the same gap meant a user with
no `household_members` row at all could issue an unfiltered `delete from feed_logs` and remove their
own recent rows from a household they had been removed from. The membership conjunct in `using` closes
both. Owner implies member, so it costs the Owner branch nothing.

## Slot matching

Per ADR 0009 the logic lives in `private`. Two things that ADR does not settle:

**`private` is not exposed over PostgREST**, so the app cannot call it directly. A thin `public`
wrapper is required:

```sql
create or replace function private.slot_states(target_pet_id uuid, target_date date)
returns table (
  schedule_id       uuid,
  scheduled_time    time,
  label             public.feeding_schedule_label,
  scheduled_at      timestamptz,
  state             text,          -- 'fed' | 'due' | 'missed' | 'upcoming'
  satisfying_log_id uuid,
  satisfied_at      timestamptz,
  satisfied_by      uuid
)
...

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
as $$
  select * from private.slot_states(target_pet_id, target_date);
$$;
```

The column list is repeated rather than shared through a composite type. A named composite would have
to live in `public` to appear in a `public` function signature, which puts a type describing private
internals into the PostgREST-exposed schema for no gain.

The wrapper is `security invoker`, **not** definer, so the underlying selects run as the calling user
and existing RLS on `feed_logs` and `feeding_schedules` applies unchanged. A definer wrapper would
expose any household's feeding history to any authenticated user. The missed-feed cron reaches the
same function as service role, which bypasses RLS by design.

`state` is returned by the function rather than derived client-side. Deciding `missed` means
comparing `now()` against `scheduled_at + grace`, which is the window arithmetic ADR 0009 forbids
reimplementing in TypeScript.

**Matching is a global assignment, not per-slot.** ADR 0009 requires that a slot has at most one
Satisfying Feed *and* that a log satisfies at most one slot. Evaluating slots independently breaks
both halves:

```
slots 07:00 and 08:00, grace 60m, a single log at 07:30

independently:  07:00 claims it (30m away)
                08:00 claims it (30m away)   <- the same log, claimed twice
correct:        07:00 claims it
                08:00 is a Missed Feed
```

Algorithm: generate every (slot, log) pair falling inside the slot's Grace Window, order by absolute
distance ascending, then walk the list assigning greedily and skipping any pair whose slot or log is
already taken. A `plpgsql` loop over 2–4 slots and a handful of logs. The data is tiny and the loop is
obviously correct, where a `distinct on` constrains only one side of the pairing.

Ties — a log exactly equidistant between two slots — break toward the earlier slot, so the result is
deterministic.

All arithmetic resolves in the household's timezone, since Scheduled Times are wall-clock times with
no date of their own. `scheduled_at` is `(target_date + scheduled_time) at time zone
households.timezone`.

### Where the computation runs

| Option | Verdict |
|---|---|
| **RPC taking pet and date** | **Chosen.** One function answers Home (today), each Activity day header (that date), the double-feed check and the cron. |
| A view over "today" | Rejected. No parameters, so it cannot answer *yesterday*, and Activity's day headers would need a second implementation. |
| Compute in TypeScript | Rejected by ADR 0009 explicitly. |

Activity costs one RPC per visible day header — roughly ten per 30-log page. If that measurably
degrades scrolling, the fix is a date-range variant of the function, not a client-side cache that
could disagree with the server.

## Client data layer

Hooks follow the existing pattern in `use-has-household.ts`: plain `useQuery`, array key, throw on
error.

| Hook | Key | Notes |
|---|---|---|
| `useHousehold()` | `['household', userId]` | Returns `id`, `timezone` and `grace_window_minutes`. Nothing provides these today — `useHasHousehold` returns only a boolean — and both the day grouping and every other hook here need the id. Built first. |
| `usePet()` | `['pet', householdId]` | Nothing outside onboarding currently reads `pets`. v1 returns the household's single pet. |
| `useSlotStates(petId, date)` | `['slot-states', petId, date]` | `rpc('pet_slot_states')`. `date` is an ISO `YYYY-MM-DD` string in household timezone — never a `Date`, which re-serialises every render and thrashes the cache. |
| `useFeedLogs(petId)` | `['feed-logs', petId]` | `useInfiniteQuery`, 30 per page, cursor on `logged_at desc`. |
| `useFeedLog(logId)` | `['feed-log', logId]` | Single row, for the deep-linked sheet. |
| `useLogFeed()` | — | Insert. |
| `useUpdateFeedLog()` | — | Notes and `logged_at` corrections. |
| `useDeleteFeedLog()` | — | Undo and delete, one path. |

All three mutations invalidate `['slot-states', petId]` and `['feed-logs', petId]` on settle. Prefix
invalidation catches every cached date without enumerating them.

Today's slot-states query additionally sets `refetchInterval: 60_000`. `state` is computed
server-side at fetch time, so a slot sitting at `due` would otherwise flip to `missed` with nothing
telling the client. A few rows once a minute while Home is focused is cheaper than a client-side
clock that would have to re-derive the boundary it is not allowed to know.

### Liveness

Two distinct mechanisms, both required.

**App foreground.** `useFocusEffect` does not fire when the app returns from the background, which is
the case that matters most: the phone is in a pocket, a housemate feeds the dog, the app reopens.
TanStack's documented React Native pattern bridges `AppState` to `focusManager`, once, in the root
layout:

```tsx
useEffect(() => {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (!isWeb) focusManager.setFocused(status === 'active');
  });
  return () => subscription.remove();
}, []);
```

This requires adding an `isWeb` export to `src/utils/platform.ts`, which currently exports only
`isIOS` and `isAndroid`. Per AGENTS.md, `Platform` is not referenced directly outside that file.

**Screen focus.** A shared hook, using `useFocusEffect` from `expo-router` (it is exported there, so
`@react-navigation/native` does not become a direct dependency):

```tsx
export function useRefreshOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const firstTimeRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // Skip the mount focus -- useQuery has already fetched by then.
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      queryClient.refetchQueries({ queryKey, stale: true, type: 'active' });
    }, [queryClient, queryKey])
  );
}
```

`refetchQueries({ stale: true })` rather than `invalidateQueries`: invalidation ignores `staleTime`
and would re-run every per-day slot-state RPC on every tab switch, refetching day headers that have
not changed.

**Unverified:** whether `useFocusEffect` fires reliably on **native tab** switches
(`expo-router/unstable-native-tabs`), since those tabs are UIKit-backed rather than JS-rendered. This
must be confirmed on the simulator — log a feed, switch tabs, confirm the other screen updates. If it
does not fire, the fallback is `useIsFocused()` driving an effect.

## Log flow

```
tap "Log a feed"
   |
   +- read cached slot-states for today (Home already holds it -- no fetch)
   |  find the slot whose Grace Window contains now()
   |
   +- slot exists AND slot.satisfying_log_id is set
   |     +- present DoubleFeedSheet --+- "Feed anyway" -+
   |                                  +- "Cancel" -> stop
   |
   +- otherwise ------------------------------------------+
                                                          v
                                              insert into feed_logs
                                              (logged_at = now())
                                                          |
                                              toast: "Rufus fed"
                                                 [Undo] [Add note]
```

The Double Feed check reads the **cached** slot-states. Home is the only entry point and already
holds today's state; a stale cache here means at worst a missed warning, never a wrong write.

**Writes are not optimistic.** The toast fires on mutation success. RLS can genuinely reject an
insert, and an optimistic row that silently rolls back is exactly the "app said the pet was fed when
it wasn't" failure PRODUCT_BRIEF calls trust-collapsing.

**Undo** hard-deletes by id. **Add note** opens the correction sheet against the log just created.

## Screens

### Home

Replaces the current `<Text>Home</Text>` placeholder in
`src/app/(protected)/(tabs)/home/index.tsx`.

```
+------------------------------+
|  Rufus                       |
|                              |
|  Today                       |
|  * Morning   07:00  Dylan, 07:12 |
|  * Lunch     12:00  Sam, 12:30   |
|  o Dinner    17:00  Upcoming     |
|                              |
|      [   Log a feed   ]      |
+------------------------------+
```

Each row renders from one `pet_slot_states` row: label, scheduled time, and a presentation of
`state` (`fed` shows who and when; `due`, `missed` and `upcoming` show their own treatment).

`DoubleFeedSheet` and `FeedLogSheet` are siblings of the button, presented by ref, per the AGENTS.md
sheet convention.

No analytics or streaks — v2, and empty in week one regardless.

### Activity

New third tab, between Home and Profile, SF symbol `list.bullet`.

`LegendList` from `@legendapp/list` (already installed), infinite, 30 per page. Rows are grouped into
day sections client-side; the boundary is
`dayjs(log.logged_at).tz(household.timezone).format('YYYY-MM-DD')` — never device-local, or a
travelling member sees feeds land on the wrong day. Each day header calls `useSlotStates(petId,
thatDate)` for its `Fed 2 of 3` count.

Tapping a row opens `FeedLogSheet` with that log's detail, and its edit and delete controls when
permitted.

### Deep link

A notification tapped three weeks later points at a log nowhere near page 1, so paging until found is
unbounded. The sheet therefore does not read from the list:

```
notification tap
   +- router.push('/activity?logId=abc')
         +- Activity mounts; the list loads page 1 independently
         +- useLocalSearchParams yields logId
               +- useQuery(['feed-log', 'abc'])   <- one row, fetched directly
                     +- on success: sheetRef.current?.present()
                           +- router.setParams({ logId: undefined })
```

Clearing the param immediately means back-navigation and a second tap on the same notification both
behave. The list and the sheet stay independent, so the sheet works for any log id regardless of how
far the list has scrolled.

### Permissions in the UI

Edit and delete controls render only when
`isOwner || (log.logged_by === userId && dayjs().diff(log.created_at, 'hour') < 24)`.

This is presentation only. RLS is the actual gate; the client check exists so controls are not
offered and then rejected.

### Empty state

A reusable component, `src/components/core/empty-state.tsx`:

```tsx
type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
};
```

A large muted `Icon` in a tinted circle, an `AppText` title, an optional secondary-colour
description, and an optional action slot. Themed with a module-level `makeStyles` factory and
`useStyles`; spacing from `Spacing`; no hard-coded colours.

Activity's usage:

```tsx
<EmptyState
  icon="utensils"
  title="No feeds logged yet"
  description="Log the first feed and it'll show up here for everyone in the household."
  action={<MainButton text="Log a feed" onPress={...} />}
/>
```

No `illustration` prop yet — there is no artwork to pass it. The value of the component now is that
when v2 art arrives it is one file to change and every empty state moves together.

The icon needs a new semantic key in `src/constants/icon-map.ts`. The exact Lucide export name must
be confirmed at lucide.dev before it is added, per AGENTS.md — a wrong guess there is a bundler
error, not a type error.

## Error handling

| Case | Behaviour |
|---|---|
| Query fails (Home, Activity) | Inline error with a Retry control. Never a silent empty list — an empty Activity and a broken Activity must not look identical. |
| Mutation fails | `sonner-native` error toast with specific text. No row appears, since writes are not optimistic. |
| RLS rejects the insert | "That time is more than 24 hours ago", not the raw Postgres error. |
| Offline | "Couldn't log the feed. Check your connection." No offline queue in v1: a feed that syncs an hour later would push a Feed Logged Alert bearing the wrong time. |
| Notes over 280 characters | Zod catches it in the sheet, mirroring the database `check`. Two layers, one number. |

The Zod schema lives in `src/constants/schemas/feed-log.ts`, alongside `pet-details.ts` and the
others, shared by the log and correction flows and reusable by the Edge Function later.

## Dependencies

- `@lodev09/react-native-true-sheet` — the only new package. Install with `bunx expo install`.
  `ios/` is committed, so this is a native dependency: **the dev client must be rebuilt**, and it is
  not OTA-compatible.
- `dayjs` `utc` and `timezone` plugins — already bundled with dayjs, extended centrally in a new
  `src/lib/dates.ts`. Only `customParseFormat` is extended today. Hermes here already runs
  `Intl.DateTimeFormat().resolvedOptions().timeZone` in onboarding, which is the evidence the ICU
  data these plugins need is present.
- `sonner-native`, `@legendapp/list`, `@tanstack/react-query`, `zod` — already installed.

## Localisation

All user-facing copy is Australian/British English, per AGENTS.md: "Couldn't log the feed",
"it'll show up here", "organise", "cancelled". No Americanisms in toasts, empty states or errors.

## Known limitations

Accepted for v1, recorded so they are not rediscovered as bugs:

- Two unscheduled feeds minutes apart produce no Double Feed warning.
- Deleting a log leaves no trace, and can cause its slot to fire a Missed Feed Alert.
- Editing a Feeding Schedule retroactively changes history (ADR 0009 consequence).
- No offline queue.
- Another member's feed appears only on foreground or focus refetch, not live.
