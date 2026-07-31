# CRU-006 — Pet profile, Care Card and the Tray: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a pet a real, editable profile — bio, cover photo, gallery, Care Card and a
changeable feeding schedule — reached from a tile on a Home screen that keeps today's feed status as
its hero, with every edit happening in a new sequenced `Tray` component.

**Architecture:** Five migrations extend the data model. A `Tray` primitive built on the existing
`BaseSheet` owns every edit flow: one native sheet whose content swaps while its height animates,
never nested sheets. Home gains a descriptor-driven tile grid below the unchanged feed-status hero.
The pet detail route composes small section components; it contains none of them.

**Tech Stack:** Expo SDK 57, Expo Router, Supabase (Postgres 17), TanStack Query, Zustand,
react-hook-form + Zod, `@lodev09/react-native-true-sheet`, `react-native-reanimated` 4.5.0,
`expo-image`, `expo-image-picker`.

**Spec:** `docs/superpowers/specs/2026-08-01-cru-006-pet-profile-and-care-card-design.md`. Read it
before starting. It carries the reasoning; this plan carries the work.

## Global Constraints

- **Read the versioned Expo docs first:** https://docs.expo.dev/versions/v57.0.0/. Training data is
  stale.
- **There is no test runner in this project.** AGENTS.md: "no test runner, no `test` script". Do not
  invent one. Each task's test cycle is: a SQL assertion against the live database for data work,
  `bun run typecheck` and `bun run lint` for TypeScript, and a device check for UI. Every task below
  states its exact verification.
- **Gates:** `bun run typecheck`, `bun run lint` (two pre-existing warnings are expected — `_layout.tsx:20`
  and `auth-footer-link.tsx:25`), and spellcheck via the Node 24 path:
  `PATH="$HOME/.volta/tools/image/node/24.18.0/bin:$PATH" node node_modules/.bin/cspell --no-progress "**/*.{ts,tsx,md,sql}"`
- **Never pipe a gate to `tail`/`head` and read the exit code as success.**
- **Invoke `/frontend-design` and `/expo-native-ui` before writing any UI code**, per AGENTS.md. Not
  after, not to review.
- **Files and folders are `kebab-case`.** Path aliases `@/*` → `src/*`.
- **Prettier:** 100-char width, single quotes, no trailing commas, `bracketSameLine: true`.
- **Australian/British English** in all user-facing copy (colour, organise, cancelled, favourite).
- **Colours only via `useTheme()`. Styles only via a module-level `makeStyles` + `useStyles(makeStyles)`.**
  Never hard-code a colour string.
- **Icons only via `@/components/core/icon`**, names from `src/constants/icon-map.ts`. Never import
  `lucide-react-native` anywhere except that map. Currently registered: `camera asterisk caretDown
  caretRight dot eye eyeOff calendar clock check circleAlert plus utensils pencil userPlus pawPrint
  bell close`. Adding an icon means adding one line to the map.
- **Icon-only tappable controls use `IconButton`**, which requires `accessibilityLabel`.
- **`TrueSheet` is value-imported in `base-sheet.tsx` only.** Everywhere else, `import type`.
- **Time inputs are always `DateTimePickerValidated` with `mode="time"`.** Never a text field, never
  a masked input.
- **Read form values with `useWatch({ control, name })`, never `watch()`.** React Compiler is on.
- **Zustand stores split `State` and `Action` types, consumed with a plain destructure.**
- **Comments: default to fewer.** Comment the constraint a reader could not infer — a platform
  quirk, a Postgres semantic, why the obvious approach was rejected. Never narrate what the code
  says. The spec carries the reasoning.
- **Supabase project `crumpet`, ref `dofjrttcyjtzvqyttqdo`. There is no staging.** Every migration
  in this plan runs against production. Confirm with Dylan before applying each one.
- **Spacing tokens:** `half:2 one:4 two:8 three:16 four:24 five:32 six:64`. **Radius:** `tile:12
  card:24 full:100`.
- **Branch:** `feat/CRU-006-pet-profile-care-card`, already created.

---

## File Structure

**Migrations** (`supabase/migrations/`)
- `20260801090000_slot_states_new_slots_start_tomorrow.sql` — replaces `private.slot_states`
- `20260801090100_feeding_schedule_label_unique.sql` — partial unique index
- `20260801090200_pets_bio.sql` — one column
- `20260801090300_care_cards.sql` — `care_cards` + `care_card_medications` + RLS
- `20260801090400_pet_photos.sql` — `pet_photos` + cap trigger + RLS

**Utilities** (`src/lib/`)
- `dates.ts` — MODIFY: add `formatAge`, `formatDayAndDate`
- `styles/shadows.ts` — already softened, no change

**Hooks** (`src/hooks/`) — one concern each
- `use-pet-detail.ts`, `use-update-pet.ts`
- `use-feeding-schedules.ts`, `use-schedule-mutations.ts`
- `use-care-card.ts`, `use-care-card-mutations.ts`
- `use-pet-photos.ts`, `use-pet-photo-mutations.ts`
- `use-reduced-motion.ts`

**Core components** (`src/components/core/`)
- `tray.tsx` — sheet shell + height animation
- `tray-step.tsx` — one step's frame: title, back/close icon, content slot

**UI components** (`src/components/ui/`)
- `tile-grid.tsx`, `tile.tsx`, `home-tiles.ts` (descriptors)

**Screen sections** (`src/components/screens/pet/`)
- `pet-header.tsx`, `pet-bio.tsx`, `gallery-strip.tsx`, `care-card-section.tsx`,
  `medication-list.tsx`, `schedule-section.tsx`

**Routes**
- `src/app/(protected)/(tabs)/home/index.tsx` — MODIFY
- `src/app/(protected)/(tabs)/home/pet/[petId].tsx` — CREATE

**Forms** (`src/lib/form/`)
- `pet-schemas.ts` — Zod schemas for pet, care card, medication, slot

---

### Task 1: New schedule slots start tomorrow

Adding a 7am slot at 3pm currently marks it **Missed** for a feed that was never scheduled. That is
the "log that feels untrustworthy" failure PRODUCT_BRIEF calls fatal.

**Files:**
- Create: `supabase/migrations/20260801090000_slot_states_new_slots_start_tomorrow.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `private.slot_states(uuid, date, timestamptz)` — signature unchanged. Slots whose
  `created_at`, resolved to the household's local date, is not strictly earlier than `target_date`
  are excluded entirely.

- [ ] **Step 1: Read the function you are replacing**

Open `supabase/migrations/20260726090000_slot_states_hypothetical.sql`. The body appears twice below
with the filter added; everything else is verbatim. The signature is unchanged, so
`create or replace` works — do **not** drop and recreate, or you drop the grants with it.

- [ ] **Step 2: Write the migration**

```sql
-- A slot applies from the day AFTER it was created. Adding a 7am feed at 3pm
-- otherwise renders it Missed for a feed nobody was ever asked to give, which
-- is the exact "log you cannot trust" failure the product brief calls fatal.
--
-- The filter is applied in BOTH slot CTEs. Omitting it from the assignment CTE
-- would let a slot that does not exist yet claim a log away from one that does.

create or replace function private.slot_states(
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
  hypothetical_log_id constant uuid := '00000000-0000-0000-0000-000000000001';
  assignment jsonb := '{}'::jsonb;
  claimed_logs jsonb := '[]'::jsonb;
  pair record;
begin
  select households.timezone, make_interval(mins => households.grace_window_minutes)
    into household_timezone, grace
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if household_timezone is null then
    return;
  end if;

  day_start := target_date::timestamp at time zone household_timezone;
  next_day_start := (target_date + 1)::timestamp at time zone household_timezone;

  for pair in
    with slots as (
      select
        feeding_schedules.id as slot_id,
        ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
      from public.feeding_schedules
      where feeding_schedules.pet_id = target_pet_id
        and (feeding_schedules.created_at at time zone household_timezone)::date < target_date
    ),
    logs as (
      select feed_logs.id as log_id, feed_logs.logged_at as log_at
      from public.feed_logs
      where feed_logs.pet_id = target_pet_id
        and feed_logs.logged_at >= day_start - grace
        and feed_logs.logged_at < next_day_start + grace
      union all
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

  return query
  with slots as (
    select
      feeding_schedules.id as slot_id,
      feeding_schedules.scheduled_time as slot_time,
      feeding_schedules.label as slot_label,
      ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
    from public.feeding_schedules
    where feeding_schedules.pet_id = target_pet_id
      and (feeding_schedules.created_at at time zone household_timezone)::date < target_date
  )
  select
    slots.slot_id,
    slots.slot_time,
    slots.slot_label,
    slots.slot_at,
    case
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
```

- [ ] **Step 3: Confirm with Dylan, then apply to the live project**

There is no staging. Ask before applying. Apply via the Supabase MCP `apply_migration` tool,
project `dofjrttcyjtzvqyttqdo`, name `slot_states_new_slots_start_tomorrow`.

- [ ] **Step 4: Verify existing slots are unaffected**

Bailey's three slots were created during onboarding on an earlier date, so all three must still
appear for today.

```sql
select schedule_id, scheduled_time, label, state
from private.slot_states(
  (select id from public.pets limit 1),
  (now() at time zone (select timezone from public.households limit 1))::date
);
```

Expected: three rows — lunch 12:00, morning 13:00, dinner 17:00.

- [ ] **Step 5: Verify a slot created today is excluded today**

```sql
begin;
insert into public.feeding_schedules (pet_id, scheduled_time, label)
values ((select id from public.pets limit 1), '07:00', 'custom');

select count(*) as todays_rows
from private.slot_states(
  (select id from public.pets limit 1),
  (now() at time zone (select timezone from public.households limit 1))::date
);

select count(*) as tomorrows_rows
from private.slot_states(
  (select id from public.pets limit 1),
  (now() at time zone (select timezone from public.households limit 1))::date + 1
);
rollback;
```

Expected: `todays_rows` = 3, `tomorrows_rows` = 4. The `rollback` is what keeps this safe against
production — run the whole block as one statement.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260801090000_slot_states_new_slots_start_tomorrow.sql
git commit -m "fix: a new schedule slot applies from tomorrow, not today"
```

---

### Task 2: One slot per label, except custom

Two `dinner` slots are currently legal and produce two identical notifications — "No one has logged
Bailey's dinner feed", twice, indistinguishable. `custom` may repeat, because that is what custom is
for.

**Files:**
- Create: `supabase/migrations/20260801090100_feeding_schedule_label_unique.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: index `feeding_schedules_pet_label_idx`. Inserting a duplicate non-custom label raises
  `23505`, which Task 6's mutation hook must translate into copy.

- [ ] **Step 1: Check for existing violations before writing anything**

```sql
select pet_id, label, count(*)
from public.feeding_schedules
where label <> 'custom'
group by pet_id, label
having count(*) > 1;
```

Expected: zero rows. If any come back, stop and raise it with Dylan — the index cannot be created
until they are resolved, and deciding which duplicate to keep is his call, not yours.

- [ ] **Step 2: Write the migration**

```sql
-- The missed-feed copy names the slot by label ("Bailey's dinner feed"), so two
-- dinners produce two identical, indistinguishable notifications. `custom` is
-- exempt because repeating is its entire purpose.

create unique index feeding_schedules_pet_label_idx
  on public.feeding_schedules (pet_id, label)
  where label <> 'custom';
```

- [ ] **Step 3: Confirm with Dylan, then apply**

Supabase MCP `apply_migration`, name `feeding_schedule_label_unique`.

- [ ] **Step 4: Verify the constraint bites**

```sql
begin;
insert into public.feeding_schedules (pet_id, scheduled_time, label)
values ((select id from public.pets limit 1), '18:00', 'dinner');
rollback;
```

Expected: error `23505`, `duplicate key value violates unique constraint
"feeding_schedules_pet_label_idx"`.

- [ ] **Step 5: Verify custom still repeats**

```sql
begin;
insert into public.feeding_schedules (pet_id, scheduled_time, label) values
  ((select id from public.pets limit 1), '09:00', 'custom'),
  ((select id from public.pets limit 1), '21:00', 'custom');
select count(*) from public.feeding_schedules where label = 'custom';
rollback;
```

Expected: succeeds, count 2.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260801090100_feeding_schedule_label_unique.sql
git commit -m "fix: one feeding slot per label, except custom"
```

---

### Task 3: Age and date utilities

Age from birthdate is needed by the pet header now and by any future share surface. Computed in one
place so every surface formats it identically.

**Files:**
- Modify: `src/lib/dates.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `formatAge(birthdate: string | null, isApproximate: boolean): string | null` — `birthdate` is a
    `YYYY-MM-DD` date string. Returns `null` when birthdate is null. Returns e.g. `"3 years"`,
    `"7 months"`, `"About 3 years"`.
  - `formatDayAndDate(date: Date, timezone: string): string` — e.g. `"Friday, 1 August"`.

- [ ] **Step 1: Read the existing file first**

`src/lib/dates.ts` already exports `todayInTimezone` and `dayInTimezone`. Match its style and reuse
its imports rather than adding a second date library.

- [ ] **Step 2: Add the two functions**

```ts
export const formatAge = (birthdate: string | null, isApproximate: boolean): string | null => {
  if (!birthdate) return null;

  const born = new Date(`${birthdate}T00:00:00`);
  const now = new Date();

  let months =
    (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());

  if (now.getDate() < born.getDate()) months -= 1;
  if (months < 0) return null;

  const years = Math.floor(months / 12);
  const unit = years >= 1 ? years : months;
  const noun = years >= 1 ? 'year' : 'month';
  const value = `${unit} ${noun}${unit === 1 ? '' : 's'}`;

  return isApproximate ? `About ${value}` : value;
};

export const formatDayAndDate = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone
  }).format(date);
```

- [ ] **Step 3: Verify by inspection against these cases**

There is no test runner, so check each by reasoning through the code and confirming in the app once
Task 4 renders it:

| Input | Expected |
| --- | --- |
| `formatAge(null, false)` | `null` |
| `formatAge('2023-08-01', false)` on 2026-08-01 | `3 years` |
| `formatAge('2026-01-01', false)` on 2026-08-01 | `7 months` |
| `formatAge('2025-08-01', false)` on 2026-08-01 | `1 year` (singular) |
| `formatAge('2023-08-01', true)` | `About 3 years` |
| `formatAge('2027-01-01', false)` | `null` (future date) |

- [ ] **Step 4: Run the gates**

```bash
bun run typecheck
bun run lint
```

Expected: typecheck clean, lint at the two known warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts
git commit -m "feat: add age and day-date formatting helpers"
```

---

### Task 4: Pet detail route and header

**Files:**
- Create: `src/hooks/use-pet-detail.ts`
- Create: `src/components/screens/pet/pet-header.tsx`
- Create: `src/app/(protected)/(tabs)/home/pet/[petId].tsx`

**Interfaces:**
- Consumes: `formatAge` from Task 3.
- Produces:
  - `usePetDetail(petId: string | undefined)` — TanStack Query returning
    `{ id, name, breed, sex, birthdate, birthdateIsApproximate, photoUrl, bio }`. Query key
    `['pet-detail', petId]`.
  - Route `/home/pet/[petId]`.

- [ ] **Step 1: Invoke the UI skills**

`/frontend-design` and `/expo-native-ui`, before writing any component. AGENTS.md requires both.

- [ ] **Step 2: Write the hook**

`bio` is added in Task 7; select it now and the column will not exist yet, so **omit `bio` from the
select until Task 7** and add it there. Create `src/hooks/use-pet-detail.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type PetDetail = {
  id: string;
  name: string;
  breed: string | null;
  sex: string | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
};

async function fetchPetDetail(petId: string): Promise<PetDetail> {
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url')
    .eq('id', petId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    breed: data.breed,
    sex: data.sex,
    birthdate: data.birthdate,
    birthdateIsApproximate: data.birthdate_is_approximate,
    photoUrl: data.photo_url
  };
}

export function usePetDetail(petId: string | undefined) {
  return useQuery({
    queryKey: ['pet-detail', petId],
    queryFn: () => fetchPetDetail(petId as string),
    enabled: Boolean(petId)
  });
}
```

- [ ] **Step 3: Write the header component**

Create `src/components/screens/pet/pet-header.tsx`. Uses `expo-image` for the cover, which has a
built-in `transition` for fade-in on load.

```tsx
import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatAge } from '@/lib/dates';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

type Props = {
  name: string;
  breed: string | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
};

const PetHeader = ({ name, breed, birthdate, birthdateIsApproximate, photoUrl }: Props) => {
  const styles = useStyles(makeStyles);
  const age = formatAge(birthdate, birthdateIsApproximate);
  const subtitle = [breed, age].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <Image source={photoUrl} style={styles.photo} contentFit="cover" transition={200} />

      <AppText variant="header" size={28}>
        {name}
      </AppText>

      {subtitle.length > 0 && (
        <AppText size={15} color="textSecondary">
          {subtitle}
        </AppText>
      )}
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.two, alignItems: 'center' },
    photo: {
      width: 120,
      height: 120,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundElement
    }
  });

export default PetHeader;
```

- [ ] **Step 4: Write the route**

Create `src/app/(protected)/(tabs)/home/pet/[petId].tsx`. It composes; it contains nothing.

```tsx
import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import PetHeader from '@/components/screens/pet/pet-header';
import type { AppTheme } from '@/constants/theme';
import { usePetDetail } from '@/hooks/use-pet-detail';
import { useStyles } from '@/hooks/use-styles';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);
  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);

  if (isError) {
    return (
      <ScreenView>
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      </ScreenView>
    );
  }

  if (isLoading || !pet) {
    return (
      <ScreenView>
        <ActivityIndicator />
      </ScreenView>
    );
  }

  return (
    <ScreenView>
      <ScrollView contentContainerStyle={styles.content}>
        <PetHeader
          name={pet.name}
          breed={pet.breed}
          birthdate={pet.birthdate}
          birthdateIsApproximate={pet.birthdateIsApproximate}
          photoUrl={pet.photoUrl}
        />
      </ScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: { flexGrow: 1, paddingVertical: spacing.four, gap: spacing.four }
  });

export default PetDetail;
```

- [ ] **Step 5: Run the gates**

```bash
bun run typecheck
bun run lint
```

- [ ] **Step 6: Verify on device**

Nothing navigates here yet — Task 5 builds the tile. Reach it directly:

```bash
argent run open-url --udid <UDID> --url "crumpetapp://home/pet/<PET_ID>"
```

Get `<PET_ID>` with `select id from public.pets limit 1;`. Expected: photo, name, and
`breed · age` beneath it.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-pet-detail.ts src/components/screens/pet/pet-header.tsx \
  "src/app/(protected)/(tabs)/home/pet/[petId].tsx"
git commit -m "feat: add the pet detail route and header"
```

---

### Task 5: Home day header and the tile grid

Feed status stays exactly where it is. Tiles go beneath it. Tiles are descriptors rendered by a
generic container, so the deferred rearrangeable dashboard is a data change later rather than a
rewrite.

**Files:**
- Create: `src/components/ui/tile.tsx`
- Create: `src/components/ui/tile-grid.tsx`
- Create: `src/components/ui/home-tiles.ts`
- Modify: `src/app/(protected)/(tabs)/home/index.tsx`

**Interfaces:**
- Consumes: `formatDayAndDate` (Task 3), route `/home/pet/[petId]` (Task 4).
- Produces:
  - `type TileDescriptor = { id: string; label: string; icon: IconName; span: 1 | 2; href: string }`
  - `<TileGrid tiles={TileDescriptor[]} />`

- [ ] **Step 1: Invoke `/frontend-design` and `/expo-native-ui`**

- [ ] **Step 2: Write the tile**

Create `src/components/ui/tile.tsx`. Uses `createShadowMedium`, which is now the soft scale.

```tsx
import AppText from '@/components/core/app-text';
import Icon, { type IconName } from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  label: string;
  icon: IconName;
  href: string;
};

const Tile = ({ label, icon, href }: Props) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.navigate(href)}
      style={[styles.container, createShadowMedium(theme.colors)]}>
      <View style={styles.iconWell}>
        <Icon name={icon} size={20} color="primary" />
      </View>

      <AppText variant="header" size={16}>
        {label}
      </AppText>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 120,
      padding: spacing.three,
      borderRadius: Radius.card,
      backgroundColor: colors.backgroundElement,
      justifyContent: 'space-between'
    },
    iconWell: {
      width: 40,
      height: 40,
      borderRadius: Radius.tile,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center'
    }
  });

export default Tile;
```

- [ ] **Step 3: Write the descriptors and the grid**

Create `src/components/ui/home-tiles.ts`:

```ts
import type { IconName } from '@/components/core/icon';

export type TileDescriptor = {
  id: string;
  label: string;
  icon: IconName;
  span: 1 | 2;
  href: string;
};

export const buildHomeTiles = (petId: string | undefined): TileDescriptor[] =>
  petId ? [{ id: 'pets', label: 'Pets', icon: 'pawPrint', span: 1, href: `/home/pet/${petId}` }] : [];
```

Create `src/components/ui/tile-grid.tsx`:

```tsx
import Tile from '@/components/ui/tile';
import type { TileDescriptor } from '@/components/ui/home-tiles';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  tiles: TileDescriptor[];
};

const TileGrid = ({ tiles }: Props) => {
  const styles = useStyles(makeStyles);

  if (tiles.length === 0) return null;

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.id} style={tile.span === 2 ? styles.full : styles.half}>
          <Tile label={tile.label} icon={tile.icon} href={tile.href} />
        </View>
      ))}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.three },
    half: { flexBasis: '48%', flexGrow: 1 },
    full: { flexBasis: '100%' }
  });

export default TileGrid;
```

- [ ] **Step 4: Add the day header and the grid to Home**

In `src/app/(protected)/(tabs)/home/index.tsx`, add the imports, then place the date above the pet
name and the grid below the slots block, inside the same `ScrollView`:

```tsx
import TileGrid from '@/components/ui/tile-grid';
import { buildHomeTiles } from '@/components/ui/home-tiles';
import { formatDayAndDate, todayInTimezone } from '@/lib/dates';
```

Above the `pet?.name` heading:

```tsx
{timezone && (
  <AppText size={14} color="textSecondary">
    {formatDayAndDate(new Date(), timezone)}
  </AppText>
)}
```

After the closing brace of the slots conditional, still inside the `ScrollView`:

```tsx
<TileGrid tiles={buildHomeTiles(pet?.id)} />
```

Replace the existing `Today` label — the day header now carries that job, and two date-ish strings
stacked reads as a mistake.

- [ ] **Step 5: Run the gates**

```bash
bun run typecheck
bun run lint
```

- [ ] **Step 6: Verify on device**

Launch the app on the booted simulator, then `describe` to confirm the tree, then tap the Pets tile.

```bash
argent run launch-app --udid <UDID> --bundleId au.com.crumpet.ios
argent run describe --udid <UDID>
```

Expected: date line, pet name, three slot rows, then a Pets tile. Tapping it opens pet detail.
**Never derive tap coordinates from a screenshot** — use `describe`.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/tile.tsx src/components/ui/tile-grid.tsx \
  src/components/ui/home-tiles.ts "src/app/(protected)/(tabs)/home/index.tsx"
git commit -m "feat: add the day header and pets tile to home"
```

---

### Task 6: The Tray

One native sheet whose content swaps while its height animates. **Never nested sheets** — AGENTS.md
records that stacking a modal on a native sheet is a rough edge on iOS. Height varying between steps
is what makes a sequence read as progression rather than a swap.

**Files:**
- Create: `src/components/core/tray-step.tsx`
- Create: `src/components/core/tray.tsx`

**Interfaces:**
- Consumes: `BaseSheet`.
- Produces:
  - `type TrayStepDescriptor = { id: string; title: string; render: () => ReactNode }` — named with
    the `Descriptor` suffix because `TrayStep` is also a component in this task.
  - `<Tray sheetRef={ref} steps={TrayStepDescriptor[]} onDismiss?={() => void} />`
  - `useTray()` → `{ goTo(stepId: string), back(), close() }` via context, for step content to drive
    the sequence.

- [ ] **Step 1: Invoke `/frontend-design` and `/expo-native-ui`**

- [ ] **Step 2: Register the back icon**

`caretLeft` is not in the icon map yet. Add one line to `src/constants/icon-map.ts`, importing
`ChevronLeft` alongside the existing Lucide imports:

```ts
caretLeft: ChevronLeft,
```

- [ ] **Step 3: Write the step frame**

Create `src/components/core/tray-step.tsx`. Owns one step's chrome: title plus the icon that
dismisses on step one and goes back after it.

```tsx
import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  title: string;
  isFirst: boolean;
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
};

const TrayStep = ({ title, isFirst, onBack, onClose, children }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          name={isFirst ? 'close' : 'caretLeft'}
          accessibilityLabel={isFirst ? 'Close' : 'Back'}
          variant="ghost"
          size={20}
          onPress={isFirst ? onClose : onBack}
        />

        <AppText variant="header" size={18}>
          {title}
        </AppText>
      </View>

      {children}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.three },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.two }
  });

export default TrayStep;
```

- [ ] **Step 4: Write the Tray**

Create `src/components/core/tray.tsx`.

```tsx
import BaseSheet from '@/components/bottom-sheets/base-sheet';
import TrayStep from '@/components/core/tray-step';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

export type TrayStepDescriptor = {
  id: string;
  title: string;
  render: () => ReactNode;
};

type TrayControls = {
  goTo: (stepId: string) => void;
  back: () => void;
  close: () => void;
};

const TrayContext = createContext<TrayControls | null>(null);

export const useTray = (): TrayControls => {
  const controls = useContext(TrayContext);
  if (!controls) throw new Error('useTray must be used inside a Tray');
  return controls;
};

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  steps: TrayStepDescriptor[];
  onDismiss?: () => void;
};

const Tray = ({ sheetRef, steps, onDismiss }: Props) => {
  const [history, setHistory] = useState<string[]>([]);

  const activeId = history[history.length - 1] ?? steps[0]?.id;
  const active = steps.find((step) => step.id === activeId) ?? steps[0];

  const close = useCallback(() => {
    void sheetRef.current?.dismiss();
  }, [sheetRef]);

  // 'auto' re-measures the swapped content, which is what animates the height
  // between steps. Nested sheets are not an option -- iOS handles a modal
  // stacked on a native sheet badly (AGENTS.md, ADR 0010).
  const resize = useCallback(() => {
    void sheetRef.current?.resize(0);
  }, [sheetRef]);

  const controls = useMemo<TrayControls>(
    () => ({
      goTo: (stepId) => {
        setHistory((current) => [...current, stepId]);
        resize();
      },
      back: () => {
        setHistory((current) => current.slice(0, -1));
        resize();
      },
      close
    }),
    [close, resize]
  );

  const handleDismiss = useCallback(() => {
    setHistory([]);
    onDismiss?.();
  }, [onDismiss]);

  if (!active) return null;

  return (
    <TrayContext.Provider value={controls}>
      <BaseSheet sheetRef={sheetRef} detents={['auto']} onDismiss={handleDismiss}>
        <TrayStep
          title={active.title}
          isFirst={history.length <= 1}
          onBack={controls.back}
          onClose={close}>
          {active.render()}
        </TrayStep>
      </BaseSheet>
    </TrayContext.Provider>
  );
};

export default Tray;
```

- [ ] **Step 5: Run the gates**

```bash
bun run typecheck
bun run lint
```

- [ ] **Step 6: Verify against the height rule**

The Tray has no consumer until Task 7, which is where it gets its device check. Confirm now by
inspection that: `detents={['auto']}` is set, `resize(0)` is called on every `goTo` and `back`, the
icon is `close` only when `history.length <= 1`, and `handleDismiss` resets history so reopening
starts at step one.

- [ ] **Step 7: Commit**

```bash
git add src/components/core/tray.tsx src/components/core/tray-step.tsx \
  src/constants/icon-map.ts
git commit -m "feat: add the tray, a sequenced sheet with animated height"
```

---

### Task 7: Editing the feeding schedule

The Tray's first real consumer, and the fix for the bug that made this ticket urgent.

**Files:**
- Create: `src/lib/form/pet-schemas.ts`
- Create: `src/hooks/use-feeding-schedules.ts`
- Create: `src/hooks/use-schedule-mutations.ts`
- Create: `src/components/screens/pet/schedule-section.tsx`
- Modify: `src/app/(protected)/(tabs)/home/pet/[petId].tsx`

**Interfaces:**
- Consumes: `Tray`, `useTray` (Task 6); route from Task 4.
- Produces:
  - `useFeedingSchedules(petId)` → `{ id, scheduledTime, label }[]`, key `['feeding-schedules', petId]`
  - `useUpsertSlot(petId)`, `useDeleteSlot(petId)` — both invalidate `['feeding-schedules', petId]`
    and `['slot-states', petId]`
  - `slotSchema` — Zod

- [ ] **Step 1: Invoke `/frontend-design` and `/expo-native-ui`**

- [ ] **Step 2: Write the schema**

Create `src/lib/form/pet-schemas.ts`:

```ts
import { z } from 'zod';

export const SCHEDULE_LABELS = ['morning', 'lunch', 'dinner', 'custom'] as const;

export const slotSchema = z.object({
  label: z.enum(SCHEDULE_LABELS),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time')
});

export type SlotInput = z.infer<typeof slotSchema>;
```

- [ ] **Step 3: Write the read hook**

Create `src/hooks/use-feeding-schedules.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type FeedingSlot = { id: string; scheduledTime: string; label: string };

async function fetchSchedules(petId: string): Promise<FeedingSlot[]> {
  const { data, error } = await supabase
    .from('feeding_schedules')
    .select('id, scheduled_time, label')
    .eq('pet_id', petId)
    .order('scheduled_time', { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    scheduledTime: row.scheduled_time.slice(0, 5),
    label: row.label
  }));
}

export function useFeedingSchedules(petId: string | undefined) {
  return useQuery({
    queryKey: ['feeding-schedules', petId],
    queryFn: () => fetchSchedules(petId as string),
    enabled: Boolean(petId)
  });
}
```

- [ ] **Step 4: Write the mutations**

Create `src/hooks/use-schedule-mutations.ts`. The `23505` translation is the important part — Task 2's
index surfaces as a raw Postgres error otherwise.

```ts
import { supabase } from '@/lib/supabase/client';
import type { SlotInput } from '@/lib/form/pet-schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const DUPLICATE_LABEL = '23505';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['feeding-schedules', petId] });
  void queryClient.invalidateQueries({ queryKey: ['slot-states', petId] });
};

export function useUpsertSlot(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SlotInput & { id?: string }) => {
      const row = {
        pet_id: petId,
        label: input.label,
        scheduled_time: input.scheduledTime
      };

      const { error } = input.id
        ? await supabase.from('feeding_schedules').update(row).eq('id', input.id)
        : await supabase.from('feeding_schedules').insert(row);

      if (error?.code === DUPLICATE_LABEL) {
        throw new Error(`There is already a ${input.label} feed. Edit that one instead.`);
      }

      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useDeleteSlot(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from('feeding_schedules').delete().eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}
```

- [ ] **Step 5: Write the section**

Create `src/components/screens/pet/schedule-section.tsx`. It renders the list and owns the Tray that
edits it. The time input is `DateTimePickerValidated` with `mode="time"` — never a text field.

Structure it as: a `SectionHeader` row with an `IconButton` (`plus`, label "Add a feed time"), one
row per slot with an `IconButton` (`pencil`, label `Edit ${label} feed`), and a `Tray` whose steps
are `['list', 'edit']`. The `edit` step holds a `react-hook-form` form bound to `slotSchema` through
`@hookform/resolvers/zod`, reading values with `useWatch`, and calls `useUpsertSlot` on submit then
`useTray().back()`.

Follow the existing form pattern in `src/app/(protected)/(onboarding)/feeding-schedule.tsx` — it
already binds `DateTimePickerValidated` correctly and is the reference for this codebase's form
conventions.

- [ ] **Step 6: Mount it on the route**

In `src/app/(protected)/(tabs)/home/pet/[petId].tsx`, add below `<PetHeader />`:

```tsx
<ScheduleSection petId={pet.id} />
```

- [ ] **Step 7: Run the gates**

```bash
bun run typecheck
bun run lint
```

- [ ] **Step 8: Verify on device**

Use `describe` before every tap.

1. Open pet detail. Expected: three slots, `12:00 PM lunch`, `1:00 PM morning`, `5:00 PM dinner`.
2. Edit the morning slot to `07:00`. Expected: the tray height changes between the list and edit
   steps, and the icon becomes back rather than close.
3. Save. Expected: the list shows `7:00 AM morning`, and Home's slot rows update on focus.
4. Add a second `dinner`. Expected: the copy "There is already a dinner feed. Edit that one
   instead." — not a raw Postgres error.
5. Add a `custom` slot at a time already past today. Expected: it does **not** appear on Home today
   (Task 1), and does appear tomorrow.
6. **Changing a time after a missed-feed alert has already fired produces no second alert.** Pick a
   slot with a `missed_feed` alert for today, change its time, then re-run the sweep:
   ```sql
   select private.sweep_missed_feeds();
   select count(*) from public.alerts
   where kind = 'missed_feed' and subject_id = '<SLOT_ID>'
     and subject_date = (now() at time zone (select timezone from public.households limit 1))::date;
   ```
   Expected: still 1. `alerts_idempotency_idx` is what guarantees it.
7. **Deleting a slot leaves its alerts orphaned but harmless.** Delete a slot that has alert rows,
   then confirm Activity still loads and the rows are stamped rather than crashing dispatch:
   ```sql
   select id, error, sent_at from public.alerts where subject_id = '<DELETED_SLOT_ID>';
   ```
   Expected: rows survive with `error = 'subject not found'` once dispatched. `alerts.subject_id`
   has no foreign key by design — it is polymorphic across `feed_logs` and `feeding_schedules`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/form/pet-schemas.ts src/hooks/use-feeding-schedules.ts \
  src/hooks/use-schedule-mutations.ts src/components/screens/pet/schedule-section.tsx \
  "src/app/(protected)/(tabs)/home/pet/[petId].tsx"
git commit -m "feat: edit the feeding schedule from the pet detail screen"
```

---

### Task 8: Pet bio

**Files:**
- Create: `supabase/migrations/20260801090200_pets_bio.sql`
- Create: `src/hooks/use-update-pet.ts`
- Create: `src/components/screens/pet/pet-bio.tsx`
- Modify: `src/hooks/use-pet-detail.ts`, `src/lib/form/pet-schemas.ts`, route

**Interfaces:**
- Produces: `useUpdatePet(petId)` mutation accepting `Partial<{ name, breed, bio }>`; invalidates
  `['pet-detail', petId]` and `['pet', householdId]`.

- [ ] **Step 1: Write and apply the migration**

```sql
alter table public.pets add column bio text;
```

Confirm with Dylan, then apply via `apply_migration`, name `pets_bio`.

- [ ] **Step 2: Verify the column exists**

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'pets' and column_name = 'bio';
```

Expected: one row, `text`, `YES`.

- [ ] **Step 3: Add `bio` to the read hook**

In `src/hooks/use-pet-detail.ts`, add `bio` to the select list, to `PetDetail`, and to the returned
object:

```ts
.select('id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url, bio')
```

```ts
bio: string | null;
```

```ts
bio: data.bio
```

- [ ] **Step 4: Write the mutation**

Create `src/hooks/use-update-pet.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type PetPatch = { name?: string; breed?: string | null; bio?: string | null };

export function useUpdatePet(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: PetPatch) => {
      const { error } = await supabase.from('pets').update(patch).eq('id', petId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    }
  });
}
```

- [ ] **Step 5: Add the schema**

Append to `src/lib/form/pet-schemas.ts`:

```ts
export const bioSchema = z.object({
  bio: z.string().max(500, 'Keep it under 500 characters').nullable()
});

export type BioInput = z.infer<typeof bioSchema>;
```

- [ ] **Step 6: Write the section and mount it**

Create `src/components/screens/pet/pet-bio.tsx`: the bio text, an empty state reading "Add a few
words about {name}", and an edit `IconButton` opening a single-step `Tray` with a multiline
`TextInputValidated` bound to `bioSchema`. Mount below `<ScheduleSection />`.

- [ ] **Step 7: Gates and device check**

```bash
bun run typecheck
bun run lint
```

Add a bio, reopen the screen, confirm it persists. Confirm the 501st character is rejected with the
copy above rather than a silent truncation.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260801090200_pets_bio.sql src/hooks/use-update-pet.ts \
  src/hooks/use-pet-detail.ts src/components/screens/pet/pet-bio.tsx \
  src/lib/form/pet-schemas.ts "src/app/(protected)/(tabs)/home/pet/[petId].tsx"
git commit -m "feat: add an editable pet bio"
```

---

### Task 9: Care Card schema

**Files:**
- Create: `supabase/migrations/20260801090300_care_cards.sql`

**Interfaces:**
- Produces: `public.care_cards` (1:1 on `pet_id`) and `public.care_card_medications`.

- [ ] **Step 1: Write the migration**

```sql
-- A handover document, not a medical record (CONTEXT.md). It holds what a
-- Contributor needs to look after the animal today, never dated clinical
-- history -- the vet already keeps that.

create table public.care_cards (
  pet_id uuid primary key references public.pets (id) on delete cascade,
  allergies text,
  vet_name text,
  vet_phone text,
  emergency_vet_name text,
  emergency_vet_phone text,
  microchip_number text,
  insurance_provider text,
  insurance_policy_number text,
  feeding_notes text,
  notes text,
  updated_at timestamptz not null default now()
);

create table public.care_card_medications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  name text not null,
  dose text,
  schedule_text text,
  instructions text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index care_card_medications_pet_id_idx
  on public.care_card_medications (pet_id, sort_order);

alter table public.care_cards enable row level security;
alter table public.care_card_medications enable row level security;

-- Reuses the helpers from the onboarding migration: feeding_schedules has no
-- household_id of its own either, and these join through pets the same way.

create policy "Members can view a care card"
on public.care_cards for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can write a care card"
on public.care_cards for all
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

create policy "Members can view medications"
on public.care_card_medications for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can write medications"
on public.care_card_medications for all
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

revoke all on public.care_cards from anon, authenticated;
revoke all on public.care_card_medications from anon, authenticated;
grant select, insert, update, delete on public.care_cards to authenticated;
grant select, insert, update, delete on public.care_card_medications to authenticated;
```

`grant select` matters here: the Care Card is read in the app, unlike `push_tokens`. And an upsert
on `care_cards` needs SELECT anyway — `INSERT ... ON CONFLICT DO UPDATE` requires it whether or not
a row conflicts, which is the bug that made push tokens fail silently for weeks.

- [ ] **Step 2: Confirm with Dylan, then apply**

`apply_migration`, name `care_cards`.

- [ ] **Step 3: Verify RLS and grants**

```sql
select
  has_table_privilege('authenticated', 'public.care_cards', 'select') as can_select,
  has_table_privilege('authenticated', 'public.care_cards', 'insert') as can_insert,
  (select count(*) from pg_policies where tablename = 'care_cards') as policies,
  (select count(*) from pg_policies where tablename = 'care_card_medications') as med_policies;
```

Expected: `true, true, 2, 2`.

- [ ] **Step 4: Verify the upsert path actually works as the app will call it**

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"fc04a7e6-ff00-4805-a430-f5fc8b2c27e4"}';
insert into public.care_cards (pet_id, allergies)
values ((select id from public.pets limit 1), 'chicken')
on conflict (pet_id) do update set allergies = excluded.allergies;
select allergies from public.care_cards;
rollback;
```

Expected: succeeds, returns `chicken`. If it raises `42501`, the grants are wrong — fix before
moving on rather than discovering it from an empty table later.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260801090300_care_cards.sql
git commit -m "feat: add the care card and medication tables"
```

---

### Task 10: Care Card UI

**Files:**
- Create: `src/hooks/use-care-card.ts`, `src/hooks/use-care-card-mutations.ts`
- Create: `src/components/screens/pet/care-card-section.tsx`, `src/components/screens/pet/medication-list.tsx`
- Modify: `src/lib/form/pet-schemas.ts`, route

**Interfaces:**
- Produces: `useCareCard(petId)` → `{ card, medications }`, key `['care-card', petId]`;
  `useUpsertCareCard(petId)`, `useUpsertMedication(petId)`, `useDeleteMedication(petId)`.

- [ ] **Step 1: Invoke `/frontend-design` and `/expo-native-ui`**

- [ ] **Step 2: Add the schemas**

Append to `src/lib/form/pet-schemas.ts`:

```ts
export const careCardSchema = z.object({
  allergies: z.string().nullable(),
  vetName: z.string().nullable(),
  vetPhone: z.string().nullable(),
  emergencyVetName: z.string().nullable(),
  emergencyVetPhone: z.string().nullable(),
  microchipNumber: z.string().nullable(),
  insuranceProvider: z.string().nullable(),
  insurancePolicyNumber: z.string().nullable(),
  feedingNotes: z.string().nullable(),
  notes: z.string().nullable()
});

export const medicationSchema = z.object({
  name: z.string().min(1, 'Give the medication a name'),
  dose: z.string().nullable(),
  scheduleText: z.string().nullable(),
  instructions: z.string().nullable()
});

export type CareCardInput = z.infer<typeof careCardSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
```

- [ ] **Step 3: Write the hooks**

`use-care-card.ts` runs two selects (`care_cards` by `pet_id`, `care_card_medications` ordered by
`sort_order`) and returns both under one query key. Use `maybeSingle()` for the card — a pet with no
Care Card yet is the normal first state, not an error.

`use-care-card-mutations.ts` exports three mutations, each invalidating `['care-card', petId]`. The
card write is an upsert on `pet_id`; medications are plain insert/update/delete.

- [ ] **Step 4: Write the sections**

`medication-list.tsx` renders one row per medication — name, dose, when, how — with edit and delete
`IconButton`s, and an add button. `care-card-section.tsx` groups the scalar fields under headings
(Allergies, Vet, Emergency, Identification, Feeding, Notes) and owns a `Tray` whose steps are
`['overview', 'edit-field', 'edit-medication']`.

**Empty state copy is direction, not mood:** "Nothing here yet. Add what a sitter would need to
know." Do not apologise.

- [ ] **Step 5: Mount and run the gates**

Add `<CareCardSection petId={pet.id} />` to the route below `<PetBio />`.

```bash
bun run typecheck
bun run lint
```

- [ ] **Step 6: Verify on device**

Add an allergy, a vet phone, and two medications. Reopen the screen and confirm all persist. Confirm
the tray height changes between the overview and edit steps, and that back returns to the overview
rather than closing.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-care-card.ts src/hooks/use-care-card-mutations.ts \
  src/components/screens/pet/care-card-section.tsx \
  src/components/screens/pet/medication-list.tsx \
  src/lib/form/pet-schemas.ts "src/app/(protected)/(tabs)/home/pet/[petId].tsx"
git commit -m "feat: add the care card to the pet detail screen"
```

---

### Task 11: Photo gallery schema

**Files:**
- Create: `supabase/migrations/20260801090400_pet_photos.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 10 is the hard ceiling, enforced here because a client-side check is advice
-- and a trigger is a rule. The free-tier cap of 3 is a product rule and lives
-- in the app, once RevenueCat exists.

create table public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index pet_photos_pet_id_idx on public.pet_photos (pet_id, sort_order);

create or replace function private.enforce_pet_photo_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.pet_photos where pet_id = new.pet_id) >= 10 then
    raise exception 'A pet can have at most 10 photos'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger pet_photos_cap
before insert on public.pet_photos
for each row
execute function private.enforce_pet_photo_cap();

alter table public.pet_photos enable row level security;

create policy "Members can view pet photos"
on public.pet_photos for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can write pet photos"
on public.pet_photos for all
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

revoke all on public.pet_photos from anon, authenticated;
grant select, insert, update, delete on public.pet_photos to authenticated;
```

- [ ] **Step 2: Confirm with Dylan, then apply**

`apply_migration`, name `pet_photos`.

- [ ] **Step 3: Verify the cap trigger fires**

```sql
begin;
insert into public.pet_photos (pet_id, storage_path)
select (select id from public.pets limit 1), 'test/' || generate_series(1, 10);

insert into public.pet_photos (pet_id, storage_path)
values ((select id from public.pets limit 1), 'test/11');
rollback;
```

Expected: the first insert succeeds with 10 rows, the second raises `A pet can have at most 10
photos`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260801090400_pet_photos.sql
git commit -m "feat: add the pet photo gallery table with a hard cap of ten"
```

---

### Task 12: Gallery UI

**Files:**
- Create: `src/hooks/use-pet-photos.ts`, `src/hooks/use-pet-photo-mutations.ts`
- Create: `src/components/screens/pet/gallery-strip.tsx`
- Modify: route

**Interfaces:**
- Produces: `usePetPhotos(petId)` → `{ id, url, sortOrder }[]`; `useAddPetPhoto(petId)`,
  `useDeletePetPhoto(petId)`, `useSetCoverPhoto(petId)`.

**This task also covers the cover photo**, which nothing else does. `pets.photo_url` is set once
during onboarding and is currently unchangeable — the same class of hole as the feeding schedule.
It belongs here because it reuses this task's picker and upload path exactly.

- [ ] **Step 1: Invoke `/frontend-design` and `/expo-native-ui`**

- [ ] **Step 2: Write the hooks**

Upload goes to the existing **public** `pet-photos` bucket, reusing the pattern already in the
onboarding pet-details screen — read it first rather than inventing a second upload path. Path
convention: `${petId}/${crypto.randomUUID()}.jpg`. Read URLs come from `getPublicUrl()`, which
bypasses `storage.objects` RLS by design.

Picking uses `expo-image-picker`, already a dependency.

`useSetCoverPhoto(petId)` writes `pets.photo_url` and invalidates both `['pet-detail', petId]` and
`['pet']`, so Home's tile and the header update together:

```ts
export function useSetCoverPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (publicUrl: string) => {
      const { error } = await supabase
        .from('pets')
        .update({ photo_url: publicUrl })
        .eq('id', petId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    }
  });
}
```

- [ ] **Step 3: Write the strip**

Horizontal `ScrollView` of `expo-image` thumbnails with `transition={200}`, an add button, and
long-press to delete with a confirmation `Tray`. Empty state: "No photos yet."

Surface the cap in copy before the trigger does: when the count reaches 10, disable the add button
and show "You've reached 10 photos." An error from the database at that point is a bug in this
screen, not a feature.

- [ ] **Step 4: Mount and run the gates**

Add `<GalleryStrip petId={pet.id} />` below `<PetHeader />`.

```bash
bun run typecheck
bun run lint
```

- [ ] **Step 5: Verify on device**

Add three photos, confirm they persist across a reopen, delete one, confirm the count drops. Then
tap a gallery photo and set it as the cover. Expected: the header photo changes **and** so does the
Pets tile on Home, because both query keys are invalidated.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-pet-photos.ts src/hooks/use-pet-photo-mutations.ts \
  src/components/screens/pet/gallery-strip.tsx \
  "src/app/(protected)/(tabs)/home/pet/[petId].tsx"
git commit -m "feat: add the pet photo gallery"
```

---

### Task 13: Tile motion

Tiles enter once per app launch, never per focus. Home is hit several times a day to answer one
question fast; a 400ms performance on every tab switch turns charm into friction.

**Files:**
- Create: `src/hooks/use-reduced-motion.ts`
- Modify: `src/components/ui/tile-grid.tsx`

- [ ] **Step 1: Write the reduced-motion hook**

```ts
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setIsReduced);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduced
    );

    return () => subscription.remove();
  }, []);

  return isReduced;
}
```

- [ ] **Step 2: Add the stagger to `TileGrid`**

A module-scope flag is what makes this once-per-launch: it survives remounts on tab switch and
resets only when the JS context does.

```tsx
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// Module scope on purpose: tiles animate once per app launch, not once per
// focus. A ref would reset on every tab switch and replay the entrance.
let hasAnimated = false;
```

Replace the tile wrapper `View` with `Animated.View`, and:

```tsx
const isReduced = useReducedMotion();
const shouldAnimate = !hasAnimated && !isReduced;

useEffect(() => {
  hasAnimated = true;
}, []);
```

```tsx
<Animated.View
  key={tile.id}
  entering={shouldAnimate ? FadeInDown.delay(index * 60).springify() : undefined}
  style={tile.span === 2 ? styles.full : styles.half}>
```

- [ ] **Step 3: Run the gates**

```bash
bun run typecheck
bun run lint
```

- [ ] **Step 4: Verify both paths on device**

1. Cold start the app. Expected: tiles fade and rise, staggered.
2. Switch to Activity and back. Expected: tiles are simply there, no animation.
3. Enable Settings → Accessibility → Motion → Reduce Motion, cold start again. Expected: no
   animation at all.
4. Confirm the feed-status hero never animates in any of the three.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-reduced-motion.ts src/components/ui/tile-grid.tsx
git commit -m "feat: stagger the tile entrance once per launch"
```

---

### Task 14: ADRs and documentation

**Files:**
- Create: `docs/adr/0014-tray-is-one-sheet-with-swapping-content.md`
- Create: `docs/adr/0015-pulling-multi-pet-groundwork-forward.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write ADR 0014**

Follow the format of the existing ADRs — status frontmatter, a title stating the decision,
**Considered options** with what was rejected and why, and **Consequences**.

Content: a tray sequence is one `TrueSheet` whose content swaps while its height animates via
`resize(0)` against `detents={['auto']}`. Nested sheets were rejected because iOS handles a modal
stacked on a native sheet badly — already recorded in AGENTS.md and ADR 0010. Varying height between
steps is load-bearing, not decorative: it is what makes a sequence read as progression. Consequence:
step content must be measurable, so a step whose height cannot settle will not animate correctly.

- [ ] **Step 2: Write ADR 0015**

Content: PRODUCT_BRIEF puts multiple pets in v2 as a paywall candidate. This ticket does not build
multi-pet, but it reverses the assumption that one pet is permanent — the pet detail screen is
designed for a selector to be added at its top, and navigation deliberately avoids a list screen so
that no destination changes when a user upgrades. Consequence: `usePet()` still means "the oldest
pet" and four call sites still depend on that; multi-pet must change all four together.

- [ ] **Step 3: Update AGENTS.md**

Add a **Trays** subsection under the existing Sheets section: a Tray is the standard presentation for
a sequenced edit, built on `Tray`, never nested sheets, one concept per step. Cross-reference ADR
0014.

Also correct the stale line in **Open questions**: auth is implemented, not a placeholder.

- [ ] **Step 4: Run spellcheck**

```bash
PATH="$HOME/.volta/tools/image/node/24.18.0/bin:$PATH" node node_modules/.bin/cspell \
  --no-progress "**/*.{ts,tsx,md,sql}"
```

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0014-tray-is-one-sheet-with-swapping-content.md \
  docs/adr/0015-pulling-multi-pet-groundwork-forward.md AGENTS.md
git commit -m "docs: record the tray and multi-pet groundwork decisions"
```

---

## Deferred — do not build in this ticket

Recorded in the spec, repeated here so no task quietly grows to include them: time-of-day theming on
Home, the rearrangeable dashboard, sharing a Care Card as a PDF or link, the Profile settings list,
permission priming (reverses a recorded decision, needs its own ADR), the mascot pass, multi-pet and
the active-pet selector, delete-pet, and the Missed Feed Alerts toggle.
