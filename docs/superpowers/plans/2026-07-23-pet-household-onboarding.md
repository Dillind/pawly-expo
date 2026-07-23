# Pet & Household Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Do not begin execution until Dylan has explicitly confirmed he wants implementation to start**, per his usual process (Opus for planning, Sonnet for implementation — this plan was written on Sonnet at his direction).

**Goal:** After a user verifies their account, take them through a two-screen onboarding flow (pet details → feeding schedule) that atomically creates a household (as its owner), a pet, and a feeding schedule — then land them on `(tabs)/home`. Users who've already completed this skip straight to `(tabs)`.

**Architecture:** Everyone reaching onboarding right now is, functionally, becoming a Household Owner — the Contributor-joins-via-invite path is explicitly out of scope (see the `contributor-invite-flow-deferred` memory note) and nothing here needs to change when that's built later, because household creation is an **explicit, client-triggered action**, never a blanket signup-time trigger (see ADR 0007). The onboarding gate lives one level inside `(protected)/_layout.tsx` — a TanStack Query check for "does this user have a `household_members` row" — deliberately *not* folded into the top-level `useAuthStore`, which stays pure session identity (same separation-of-concerns reasoning as `useUserProfile` in the auth work). The two onboarding screens hold all form state in a dedicated Zustand store (`useOnboardingStore`) and persist nothing to the backend until the final screen's submit, which calls one atomic Postgres function (`create_household_and_pet`) wrapping every insert in a single transaction — avoiding any half-finished state (a pet with no feeding schedule, an orphaned household) that the "has a household" gate could be fooled by.

**Tech Stack:** Same as the auth foundation — Expo Router, Supabase (Postgres + Storage this time, not just Auth), Zustand, TanStack Query, `react-hook-form` + Zod, `expo-image-picker` (already installed, not yet used anywhere in the app).

## Global Constraints

- Same constraints as the auth foundation plan (Expo SDK 57 docs, Prettier/ESLint, kebab-case files, `@/*` alias, Australian/British English, `TextInputValidated`/Zod form convention, `useTheme()`/`useStyles`, minimal comments, `npx expo install` for new packages).
- `Intl.supportedValuesOf` is **not available** in this project's Hermes runtime (verified empirically against the running app) — the timezone picker must use a hand-curated list, not a runtime-generated one. `Intl.DateTimeFormat().resolvedOptions().timeZone` *is* available and works correctly for detecting the device's current timezone.
- No generated `database.types.ts` exists yet (AGENTS.md notes this as planned, not present) — RPC call payloads/responses need hand-written TypeScript types, not inferred ones.

---

## Task 1: Documentation + ADR 0007

**Files:**
- Modify: `docs/TECH_STACK.md`
- Create: `docs/adr/0007-household-creation-is-explicit-not-trigger-based.md`

**Interfaces:** None — docs only.

- [x] **Step 1: Write ADR 0007**

Create `docs/adr/0007-household-creation-is-explicit-not-trigger-based.md`:

```markdown
---
status: accepted
---

# Household creation is an explicit client action, never a signup-time trigger

Unlike `public.users` (populated automatically by the `handle_new_user` trigger on every signup, regardless of method — see the auth foundation migration), a `households` row is only ever created when the onboarding UI's "create your pet" submission explicitly calls `create_household_and_pet()`. Nothing creates a household as a side effect of signing up.

## Considered options

- **Auto-create a household on signup, mirroring `handle_new_user`** — rejected. `public.users` needs exactly one row per signup, unconditionally, regardless of how that user came to exist (organic signup now, Apple/Google OAuth later). A household is different: a future Contributor who signs up via an invite link (ADR 0003) should join an *existing* household, not get a second, empty, orphaned one auto-created alongside it. A blanket trigger can't tell those two cases apart at signup time — only the onboarding UI, which knows whether the user arrived with an invite code, can.
- **Explicit creation, triggered by the onboarding flow itself** (chosen). Nothing happens until the user submits the pet-creation step. When Contributor-invite-redemption is built later, it becomes a *different* action entirely (insert into `household_members` for an existing household as `contributor`) that never touches this path, so this decision doesn't need to be revisited or reworked when that lands.

## Consequences

- The onboarding gate (`(protected)/_layout.tsx` checking "does this user have a `household_members` row") stays valid and correct even after Contributor-invite-redemption is eventually built — that flow will satisfy the same gate condition via a different insert path, not by changing this one.
- `create_household_and_pet()` must be atomic (household + membership + pet + feeding schedule in one transaction) — a partial failure here would leave the exact orphaned-household state this decision is trying to avoid, just from a different cause.
- Anyone extending this later should resist the urge to "simplify" household creation into a trigger — it would silently break the Contributor path the moment that's built.
```

- [x] **Step 2: Update `docs/TECH_STACK.md` data model**

Find:

```markdown
pets
  id, household_id (→ households), name, breed, birthdate, birthdate_is_approximate, photo_url, created_at
```

Replace with:

```markdown
pets
  id, household_id (→ households), name, breed, sex (male | female), birthdate, birthdate_is_approximate, photo_url, created_at
```

- [x] **Step 3: Commit**

```bash
git add docs/TECH_STACK.md docs/adr/0007-household-creation-is-explicit-not-trigger-based.md
git commit -m "docs: add ADR 0007 for explicit household creation, update pets data model"
```

---

## Task 2: Migration — pets, feeding_schedules, storage bucket, RPC function

**Files:**
- Create: `supabase/migrations/20260723090000_pet_household_onboarding.sql`

**Interfaces:**
- Produces: tables `public.pets`, `public.feeding_schedules`; enums `public.pet_sex` (`'male' | 'female'`), `public.feeding_schedule_label` (`'morning' | 'lunch' | 'dinner' | 'custom'`); functions `private.is_pet_household_member(target_pet_id uuid)`, `private.is_pet_household_owner(target_pet_id uuid)`, `public.create_household_and_pet(household_timezone text, pet_name text, pet_breed text, pet_sex public.pet_sex, pet_birthdate date, pet_birthdate_is_approximate boolean, pet_photo_url text, feeding_times jsonb) returns public.pets`; new INSERT policies on the existing `households`/`household_members` tables; a public `pet-photos` storage bucket with its own RLS.

- [x] **Step 1: Write the migration file**

Create `supabase/migrations/20260723090000_pet_household_onboarding.sql`:

```sql
-- Pets

create type public.pet_sex as enum ('male', 'female');

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  breed text,
  sex public.pet_sex,
  birthdate date,
  birthdate_is_approximate boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.pets enable row level security;

create policy "Members can view pets in their household"
on public.pets for select
using ( private.is_household_member(household_id) );

create policy "Owners can create pets"
on public.pets for insert
with check ( private.is_household_owner(household_id) );

create policy "Owners can update pets"
on public.pets for update
using ( private.is_household_owner(household_id) )
with check ( private.is_household_owner(household_id) );

create policy "Owners can delete pets"
on public.pets for delete
using ( private.is_household_owner(household_id) );

-- Feeding schedules

create type public.feeding_schedule_label as enum ('morning', 'lunch', 'dinner', 'custom');

create table public.feeding_schedules (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  scheduled_time time not null,
  label public.feeding_schedule_label not null,
  created_at timestamptz not null default now()
);

alter table public.feeding_schedules enable row level security;

-- feeding_schedules has no household_id of its own, only pet_id -- these
-- helpers join through pets to reuse the household_members check, same
-- private-schema pattern as is_household_member/is_household_owner (see the
-- auth foundation migration for why these live in `private`, not `public`).

create or replace function private.is_pet_household_member(target_pet_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.pets
    join public.household_members on household_members.household_id = pets.household_id
    where pets.id = target_pet_id
      and household_members.user_id = auth.uid()
  );
$$;

create or replace function private.is_pet_household_owner(target_pet_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.pets
    join public.household_members on household_members.household_id = pets.household_id
    where pets.id = target_pet_id
      and household_members.user_id = auth.uid()
      and household_members.role = 'owner'
  );
$$;

create policy "Members can view feeding schedules for their household's pets"
on public.feeding_schedules for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can create feeding schedules"
on public.feeding_schedules for insert
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can update feeding schedules"
on public.feeding_schedules for update
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can delete feeding schedules"
on public.feeding_schedules for delete
using ( private.is_pet_household_owner(pet_id) );

-- Households/household_members: the auth foundation migration deliberately
-- left these tables with no INSERT policies at all (nothing could create a
-- household yet). Add them now -- see ADR 0007 for why creation is scoped to
-- "become the founding owner of a brand new household" and nothing broader
-- (this must NOT allow a user to self-insert into an EXISTING household --
-- that requires invite redemption, not built yet).

create policy "Authenticated users can create a household"
on public.households for insert
to authenticated
with check ( true );

create policy "Users can become the founding owner of a new household"
on public.household_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1 from public.household_members existing
    where existing.household_id = household_members.household_id
  )
);

-- Storage: pet photos. Public bucket -- photos aren't sensitive the way user
-- data is, and this avoids managing signed-URL expiry just to display an
-- <Image>. Uploads are still restricted by RLS, scoped to the uploader's own
-- auth.uid() in the object path.

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true);

create policy "Pet photos are publicly viewable"
on storage.objects for select
using ( bucket_id = 'pet-photos' );

create policy "Users can upload their own pet photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Atomic onboarding submission. security invoker (not definer) -- runs as
-- the calling user, subject to every RLS policy above at every step. If any
-- insert is rejected by RLS, the whole transaction rolls back: no orphaned
-- household, no pet with a missing feeding schedule (see ADR 0007).

create or replace function public.create_household_and_pet(
  household_timezone text,
  pet_name text,
  pet_breed text,
  pet_sex public.pet_sex,
  pet_birthdate date,
  pet_birthdate_is_approximate boolean,
  pet_photo_url text,
  feeding_times jsonb
)
returns public.pets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_household_id uuid;
  new_pet public.pets;
  owner_first_name text;
  feeding_time jsonb;
begin
  select first_name into owner_first_name from public.users where id = auth.uid();

  insert into public.households (name, timezone)
  values (coalesce(owner_first_name, 'My') || '''s Household', household_timezone)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  insert into public.pets (household_id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url)
  values (new_household_id, pet_name, pet_breed, pet_sex, pet_birthdate, pet_birthdate_is_approximate, pet_photo_url)
  returning * into new_pet;

  for feeding_time in select * from jsonb_array_elements(feeding_times)
  loop
    insert into public.feeding_schedules (pet_id, scheduled_time, label)
    values (
      new_pet.id,
      (feeding_time ->> 'scheduledTime')::time,
      (feeding_time ->> 'label')::public.feeding_schedule_label
    );
  end loop;

  return new_pet;
end;
$$;
```

- [x] **Step 2: Apply the migration**

Call `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "dofjrttcyjtzvqyttqdo"`, `name: "pet_household_onboarding"`, `query`: the full SQL from Step 1.

- [x] **Step 3: Verify schema and check for security advisories**

Call `mcp__plugin_supabase_supabase__list_tables` with `project_id: "dofjrttcyjtzvqyttqdo"`, `schemas: ["public"]`, `verbose: true`. Expected: `pets` and `feeding_schedules` present with the columns above.

Then call `mcp__plugin_supabase_supabase__get_advisors` with `project_id: "dofjrttcyjtzvqyttqdo"`, `type: "security"`. Expected: empty `lints` array — this migration follows the same `private`-schema pattern that fixed the security-definer exposure finding from the auth foundation work, so it should not reintroduce it. If it does, apply the same fix (move the flagged function to `private`) as a follow-up migration, exactly as documented in the auth foundation plan's Task 2.

- [x] **Step 4: Sanity-check the RPC function manually**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "dofjrttcyjtzvqyttqdo"` and this query (uses Dylan's real test account from the auth foundation testing, reads its id rather than hardcoding it):

```sql
select public.create_household_and_pet(
  'Australia/Brisbane',
  'Test Pet',
  'Test Breed',
  'male',
  '2020-01-01',
  false,
  null,
  '[{"scheduledTime": "07:00", "label": "morning"}]'::jsonb
);
```

**Important:** this runs as the `postgres`/service role via `execute_sql`, not as an authenticated app user, so `auth.uid()` inside the function will be `null` — expect this specific call to fail (`household_members` insert violates `with check (user_id = auth.uid() ...)`  since `auth.uid()` is null). That failure is itself useful confirmation that the RLS policies correctly reject calls without a real authenticated session — the actual success path gets exercised for real in Task 8's manual QA, from the app, under a real user's JWT. Don't try to work around this by using a service-role bypass here; that would prove nothing about whether the policies work for real users.

- [x] **Step 5: Commit**

```bash
git add supabase/migrations/20260723090000_pet_household_onboarding.sql
git commit -m "feat: add pets, feeding_schedules, storage bucket, and atomic onboarding RPC"
```

---

## Task 3: Storage upload helper

**Files:**
- Create: `src/services/storage.service.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase/client.ts`.
- Produces: default-exported `StorageService.uploadPetPhoto(params: { userId: string; localUri: string }): Promise<string>` — uploads to the `pet-photos` bucket under `<userId>/<uuid>.jpg`, returns the public URL.

Matches the `src/services/*.service.ts` + `namespace` + default-export convention already established by `src/services/auth.service.ts` (this is where all of this app's API-calling code lives now — not `src/lib/supabase/`, which stays limited to the raw `client.ts` the services import from).

- [ ] **Step 1: Write the helper**

Create `src/services/storage.service.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import * as Crypto from 'expo-crypto';

namespace StorageService {
  export async function uploadPetPhoto(params: {
    userId: string;
    localUri: string;
  }): Promise<string> {
    const response = await fetch(params.localUri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${params.userId}/${Crypto.randomUUID()}.jpg`;

    const { error } = await supabase.storage.from('pet-photos').upload(path, arrayBuffer, {
      contentType: 'image/jpeg'
    });

    if (error) throw error;

    const {
      data: { publicUrl }
    } = supabase.storage.from('pet-photos').getPublicUrl(path);

    return publicUrl;
  }
}

export default StorageService;
```

(`expo-crypto` is already installed — used here only for `randomUUID()`; the `arrayBuffer()` step is required because `expo-image-picker` returns a local file URI, not a `File`/`Blob` object the Supabase JS upload API can take directly.)

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/services/storage.service.ts
git commit -m "feat: add pet photo upload helper"
```

---

## Task 4: Onboarding Zustand store

**Files:**
- Create: `src/stores/onboarding-store.ts`

**Interfaces:**
- Produces: `useOnboardingStore` with `petDetails: PetDetails | null`, `timezone: string`, `feedingTimes: FeedingTime[]`, `setPetDetails`, `setSchedule`, `reset`. Types `PetDetails`, `FeedingTime` exported for reuse by the screens.

- [ ] **Step 1: Write the store**

Create `src/stores/onboarding-store.ts`:

```ts
import { create } from 'zustand';

export type FeedingTime = {
  time: string;
  label: 'morning' | 'lunch' | 'dinner' | 'custom';
};

export type PetDetails = {
  name: string;
  breed: string;
  sex: 'male' | 'female';
  birthdate: string;
  birthdateIsApproximate: boolean;
  photoUri: string | null;
};

type OnboardingState = {
  petDetails: PetDetails | null;
  timezone: string;
  feedingTimes: FeedingTime[];
  setPetDetails: (details: PetDetails) => void;
  setSchedule: (params: { timezone: string; feedingTimes: FeedingTime[] }) => void;
  reset: () => void;
};

const defaultFeedingTimes: FeedingTime[] = [
  { time: '07:00', label: 'morning' },
  { time: '12:00', label: 'lunch' },
  { time: '17:00', label: 'dinner' }
];

const initialState = {
  petDetails: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  feedingTimes: defaultFeedingTimes
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setPetDetails: (details) => set({ petDetails: details }),
  setSchedule: (params) => set(params),
  reset: () => set({ ...initialState, feedingTimes: defaultFeedingTimes })
}));
```

(`time` is stored as a plain `"HH:mm"` 24-hour string, not a `Date` — it's a wall-clock time with no date component, matching `feeding_schedules.scheduled_time`'s Postgres `time` type; wrapping it in a `Date` object would invite timezone confusion for a value that specifically isn't supposed to carry one.)

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/stores/onboarding-store.ts
git commit -m "feat: add onboarding Zustand store"
```

---

## Task 5: Onboarding gate + route scaffolding

**Files:**
- Modify: `src/app/(protected)/_layout.tsx`
- Create: `src/app/(protected)/(onboarding)/_layout.tsx`
- Create: `src/hooks/use-has-household.ts`

**Interfaces:**
- Produces: `useHasHousehold()` hook — `useQuery` wrapping a `select id from household_members where user_id = ... limit 1` check, returning `{ data: boolean | undefined, isLoading: boolean }` (renamed/mapped from the raw Query result for clarity at the call site).

- [ ] **Step 1: Write the household-check hook**

Create `src/hooks/use-has-household.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

async function fetchHasHousehold(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) throw error;

  return data.length > 0;
}

/**
 * Gates the (protected) area between (onboarding) and (tabs). Deliberately
 * separate from useAuthStore -- "has a household" is server data, not
 * session identity, same reasoning as useUserProfile in the auth work.
 */
export function useHasHousehold() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ['has-household', userId],
    queryFn: () => fetchHasHousehold(userId as string),
    enabled: Boolean(userId)
  });
}
```

- [ ] **Step 2: Wire the gate into `(protected)/_layout.tsx`**

Read the current file first to confirm it still matches (`Stack` with a single `<Stack.Screen name="(tabs)" />`) before editing.

Replace the full contents of `src/app/(protected)/_layout.tsx`:

```tsx
import { useHasHousehold } from '@/hooks/use-has-household';
import { Stack } from 'expo-router';

export default function ProtectedLayout() {
  const { data: hasHousehold, isLoading } = useHasHousehold();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasHousehold}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(hasHousehold)}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
```

- [ ] **Step 3: Scaffold the `(onboarding)` route group**

Create `src/app/(protected)/(onboarding)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="pet-details" options={{ title: 'Pet details' }} />
      <Stack.Screen name="feeding-schedule" options={{ title: 'Feeding schedule' }} />
    </Stack>
  );
}
```

(The screens themselves are written in Tasks 7–8 — same "layout can reference a route that doesn't exist yet" pattern as the auth foundation plan.)

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass (the layout referencing not-yet-existing screen files is fine for Expo Router/TypeScript — routes aren't statically imported by name here).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-has-household.ts "src/app/(protected)/_layout.tsx" "src/app/(protected)/(onboarding)/_layout.tsx"
git commit -m "feat: gate (protected) between onboarding and tabs based on household membership"
```

---

## Task 6: Zod schemas for pet details and feeding schedule

**Files:**
- Create: `src/constants/schemas/pet-details.ts`
- Create: `src/constants/schemas/feeding-schedule.ts`

**Interfaces:**
- Produces: `petDetailsSchema`/`PetDetailsFormValues`, `feedingScheduleSchema`/`FeedingScheduleFormValues`.

- [ ] **Step 1: Pet details schema**

Create `src/constants/schemas/pet-details.ts`:

```ts
import { z } from 'zod';

export const petDetailsSchema = z.object({
  name: z.string().min(1, { message: "Enter your pet's name" }),
  breed: z.string().min(1, { message: "Enter your pet's breed" }),
  sex: z.enum(['male', 'female'], { message: 'Select a sex' }),
  birthdate: z.string().min(1, { message: "Enter your pet's birthdate" }),
  birthdateIsApproximate: z.boolean(),
  photoUri: z.string().nullable()
});

export type PetDetailsFormValues = z.infer<typeof petDetailsSchema>;
```

- [ ] **Step 2: Feeding schedule schema**

Create `src/constants/schemas/feeding-schedule.ts`:

```ts
import { z } from 'zod';

export const feedingScheduleSchema = z.object({
  timezone: z.string().min(1, { message: 'Select a timezone' }),
  feedingTimes: z
    .array(
      z.object({
        time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Enter a valid time' }),
        label: z.enum(['morning', 'lunch', 'dinner', 'custom'])
      })
    )
    .min(1, { message: 'Add at least one feeding time' })
});

export type FeedingScheduleFormValues = z.infer<typeof feedingScheduleSchema>;
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/constants/schemas/pet-details.ts src/constants/schemas/feeding-schedule.ts
git commit -m "feat: add Zod schemas for pet details and feeding schedule"
```

---

## Task 7: Pet details screen

**Files:**
- Create: `src/app/(protected)/(onboarding)/pet-details.tsx`

**Interfaces:**
- Consumes: `petDetailsSchema` (Task 6), `useOnboardingStore` (Task 4).
- Produces: navigates to `/feeding-schedule` on submit, with `petDetails` populated in the store.

- [ ] **Step 1: Write the screen**

Create `src/app/(protected)/(onboarding)/pet-details.tsx`:

```tsx
import DatePickerValidated from '@/components/core/date-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import ToggleSwitch from '@/components/core/toggle-switch';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { petDetailsSchema, type PetDetailsFormValues } from '@/constants/schemas/pet-details';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { CameraIcon } from 'phosphor-react-native';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

const sexOptions = ['male', 'female'];

const PetDetails = () => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const router = useRouter();
  const setPetDetails = useOnboardingStore((state) => state.setPetDetails);
  const storedPetDetails = useOnboardingStore((state) => state.petDetails);

  const form = useForm<PetDetailsFormValues>({
    resolver: zodResolver(petDetailsSchema),
    defaultValues: storedPetDetails ?? {
      name: '',
      breed: '',
      sex: 'male',
      birthdate: '',
      birthdateIsApproximate: false,
      photoUri: null
    },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting }
  } = form;

  const photoUri = watch('photoUri');

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled) {
      setValue('photoUri', result.assets[0].uri);
    }
  };

  const onSubmit = handleSubmit((values) => {
    hapticLight();
    setPetDetails(values);
    router.push('/feeding-schedule');
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Add your pet"
          description="Tell us a bit about who you're caring for."
        />

        <FormProvider {...form}>
          <PressableOpacity style={styles.photoPicker} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <CameraIcon size={24} color={theme.colors.textSecondary} />
              </View>
            )}
          </PressableOpacity>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="name"
                  label="Name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Bailey"
                  returnKeyType="next"
                  testID="pet-name"
                />
              )}
            />
            <Controller
              control={control}
              name="breed"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="breed"
                  label="Breed"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Labrador, mixed, not sure..."
                  returnKeyType="done"
                  testID="pet-breed"
                />
              )}
            />
            <Controller
              control={control}
              name="sex"
              render={({ field: { onChange, value } }) => (
                <DropdownPickerValidated
                  name="sex"
                  label="Sex"
                  items={sexOptions}
                  value={value}
                  onChange={(next) => onChange(next as PetDetailsFormValues['sex'])}
                  getText={(item) => (item === 'male' ? 'Male' : 'Female')}
                />
              )}
            />
            <Controller
              control={control}
              name="birthdate"
              render={({ field: { onChange, value } }) => (
                <DatePickerValidated
                  name="birthdate"
                  label="Birthdate"
                  selectedDate={value}
                  setSelectedDate={onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="birthdateIsApproximate"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Approximate date"
                  description="I'm not sure of the exact date"
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text="Next"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              onPress={() => {
                void onSubmit();
              }}
            />
          </View>
        </FormProvider>
      </ScrollView>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
    },
    photoPicker: {
      alignSelf: 'center'
    },
    photo: {
      width: 96,
      height: 96,
      borderRadius: 48
    },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(128,128,128,0.15)'
    },
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default PetDetails;
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass — pay particular attention to any unused-import warning per the note above.

- [ ] **Step 3: Manual QA on simulator**

Boot the simulator, sign in with the existing verified test account (from the auth foundation testing — this account has no household yet, so it should land directly on this screen per the Task 5 gate). Confirm:
- Tapping the photo circle opens the image picker; selecting a photo shows it in the circular preview.
- Submitting with empty fields shows Zod errors.
- Filling in valid details and tapping "Next" navigates to `/feeding-schedule`.
- Backgrounding and reopening the app keeps you on this flow (still no household yet).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(protected)/(onboarding)/pet-details.tsx"
git commit -m "feat: add pet details onboarding screen"
```

---

## Task 8: Feeding schedule screen + final atomic submission

**Files:**
- Create: `src/app/(protected)/(onboarding)/feeding-schedule.tsx`
- Create: `src/constants/timezones.ts`

**Interfaces:**
- Consumes: `feedingScheduleSchema` (Task 6), `useOnboardingStore` (Task 4), `StorageService.uploadPetPhoto` (Task 3), `useAuthStore` (for `userId`).
- Produces: on successful submit, calls `supabase.rpc('create_household_and_pet', ...)`, resets the onboarding store, and (via Task 5's gate reactively re-querying) lands the user on `(tabs)/home`.

- [ ] **Step 1: Write the curated timezone list**

Create `src/constants/timezones.ts`:

```ts
export const COMMON_TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Hobart',
  'Pacific/Auckland',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'Africa/Johannesburg',
  'UTC'
] as const;
```

(Hand-curated — `Intl.supportedValuesOf('timeZone')` is not available in this project's Hermes runtime, verified empirically. If the device's detected timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` isn't in this list, the screen below falls back to including it directly rather than silently dropping the user's real timezone — see Step 2.)

- [ ] **Step 2: Write the screen**

Create `src/app/(protected)/(onboarding)/feeding-schedule.tsx`:

```tsx
import AppText from '@/components/core/app-text';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import {
  feedingScheduleSchema,
  type FeedingScheduleFormValues
} from '@/constants/schemas/feeding-schedule';
import type { AppTheme } from '@/constants/theme';
import { COMMON_TIMEZONES } from '@/constants/timezones';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { supabase } from '@/lib/supabase/client';
import StorageService from '@/services/storage.service';
import { useAuthStore } from '@/stores/auth-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

const timezoneItems = COMMON_TIMEZONES.includes(
  Intl.DateTimeFormat().resolvedOptions().timeZone as (typeof COMMON_TIMEZONES)[number]
)
  ? [...COMMON_TIMEZONES]
  : [Intl.DateTimeFormat().resolvedOptions().timeZone, ...COMMON_TIMEZONES];

const labelOptions = ['morning', 'lunch', 'dinner', 'custom'];

const FeedingSchedule = () => {
  const styles = useStyles(makeStyles);
  const userId = useAuthStore((state) => state.userId);
  const petDetails = useOnboardingStore((state) => state.petDetails);
  const storedTimezone = useOnboardingStore((state) => state.timezone);
  const storedFeedingTimes = useOnboardingStore((state) => state.feedingTimes);
  const setSchedule = useOnboardingStore((state) => state.setSchedule);
  const resetOnboarding = useOnboardingStore((state) => state.reset);

  const form = useForm<FeedingScheduleFormValues>({
    resolver: zodResolver(feedingScheduleSchema),
    defaultValues: { timezone: storedTimezone, feedingTimes: storedFeedingTimes },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting }
  } = form;

  const feedingTimes = watch('feedingTimes');

  const addFeedingTime = () => {
    setValue('feedingTimes', [...feedingTimes, { time: '15:00', label: 'custom' }]);
  };

  const removeFeedingTime = (index: number) => {
    setValue(
      'feedingTimes',
      feedingTimes.filter((_, i) => i !== index)
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    if (!petDetails || !userId) {
      toast.error('Something went wrong', { description: 'Missing pet details, go back and try again' });
      return;
    }

    setSchedule(values);

    try {
      const photoUrl = petDetails.photoUri
        ? await StorageService.uploadPetPhoto({ userId, localUri: petDetails.photoUri })
        : null;

      const { error } = await supabase.rpc('create_household_and_pet', {
        household_timezone: values.timezone,
        pet_name: petDetails.name,
        pet_breed: petDetails.breed,
        pet_sex: petDetails.sex,
        pet_birthdate: petDetails.birthdate,
        pet_birthdate_is_approximate: petDetails.birthdateIsApproximate,
        pet_photo_url: photoUrl,
        feeding_times: values.feedingTimes.map((feedingTime) => ({
          scheduledTime: feedingTime.time,
          label: feedingTime.label
        }))
      });

      if (error) throw error;

      resetOnboarding();
    } catch (error) {
      toast.error('Could not finish setup', {
        description: error instanceof Error ? error.message : 'Try again'
      });
    }
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Feeding schedule"
          description="Set the times you'll feed your pet each day."
        />

        <FormProvider {...form}>
          <Controller
            control={control}
            name="timezone"
            render={({ field: { onChange, value } }) => (
              <DropdownPickerValidated
                name="timezone"
                label="Timezone"
                items={timezoneItems}
                value={value}
                onChange={onChange}
                getText={(item) => item.replace(/_/g, ' ')}
              />
            )}
          />

          <View style={styles.feedingTimesList}>
            {feedingTimes.map((feedingTime, index) => (
              <View key={index} style={styles.feedingTimeRow}>
                <Controller
                  control={control}
                  name={`feedingTimes.${index}.time`}
                  render={({ field: { onChange, value } }) => (
                    <TextInputValidated
                      value={value}
                      onChangeText={onChange}
                      placeholder="07:00"
                      keyboardType="numbers-and-punctuation"
                      containerStyle={styles.timeInput}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`feedingTimes.${index}.label`}
                  render={({ field: { onChange, value } }) => (
                    <DropdownPickerValidated
                      items={labelOptions}
                      value={value}
                      onChange={(next) =>
                        onChange(next as FeedingScheduleFormValues['feedingTimes'][number]['label'])
                      }
                      getText={(item) => item.charAt(0).toUpperCase() + item.slice(1)}
                      wrapperStyle={styles.labelDropdown}
                    />
                  )}
                />
                <PressableOpacity onPress={() => removeFeedingTime(index)}>
                  <AppText color="red100" size={20}>
                    ×
                  </AppText>
                </PressableOpacity>
              </View>
            ))}
          </View>

          <PressableOpacity onPress={addFeedingTime} style={styles.addTime}>
            <AppText color="primary" size={16}>
              + Add another time
            </AppText>
          </PressableOpacity>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Finishing up…' : 'Finish'}
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              onPress={() => {
                void onSubmit();
              }}
            />
          </View>
        </FormProvider>
      </ScrollView>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
    },
    feedingTimesList: {
      gap: spacing.two
    },
    feedingTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    timeInput: {
      flex: 1
    },
    labelDropdown: {
      flex: 1
    },
    addTime: {
      paddingVertical: spacing.one
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default FeedingSchedule;
```

There's no dedicated time-picker component in `src/components/core/` yet, and building one is out of scope for this task — the time field above is a masked free-text `"HH:mm"` entry via the existing `TextInputValidated`, validated by the Zod regex already in `feedingScheduleSchema`. Sufficient for v1; a real time-picker can replace it later without touching the schema or the RPC payload shape.

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass.

- [ ] **Step 4: Manual QA on simulator — the real end-to-end test**

Continue from Task 7's manual QA (still signed in as the test account, pet details already filled in from the previous screen). Confirm:
- Timezone dropdown shows the device's real timezone as a valid selectable option.
- The three default feeding times (morning/lunch/dinner) are pre-populated.
- "Add another time" appends a new row; removing a row works.
- Submitting with an empty feeding-times list (remove all rows) shows the Zod "add at least one feeding time" error.
- Submitting with valid data shows "Finishing up…", then the app **reactively swaps from onboarding into `(tabs)/home`** — this is Task 5's gate re-querying after the RPC succeeds; confirm no manual navigation call was needed for this to happen, same reactive pattern already proven in the auth foundation work.
- After landing on `(tabs)/home`, use `mcp__plugin_supabase_supabase__execute_sql` to confirm the full chain actually persisted: `select households.name, households.timezone, pets.name, pets.sex, count(feeding_schedules.id) from households join pets on pets.household_id = households.id join feeding_schedules on feeding_schedules.pet_id = pets.id group by 1,2,3,4;` — expect one row matching what was entered.
- Force-quit and relaunch the app — confirm it now lands directly on `(tabs)/home` (skips onboarding), proving the Task 5 gate correctly detects the now-existing `household_members` row on a cold start, not just reactively mid-session.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(protected)/(onboarding)/feeding-schedule.tsx" src/constants/timezones.ts
git commit -m "feat: add feeding schedule screen with atomic onboarding submission"
```

---

## Self-Review Notes

- **Spec coverage:** routing/gate architecture (Task 5), explicit-not-trigger household creation + ADR (Tasks 1–2), photo upload with Storage (Tasks 2–3), Zustand wizard state (Task 4), two-screen pet-details → feeding-schedule flow (Tasks 7–8), atomic RPC submission (Task 2, called from Task 8) — all covered. Contributor-invite-redemption and the caretaker-profile idea are out of scope per the session's memory notes, not attempted here.
- **Placeholder scan (caught and fixed during self-review):** Task 8's feeding-schedule screen was first drafted with a stray unused import and a reference to a nonexistent `TextInputValidatedTime` component, with a separate "fix it" step following on. That's exactly the kind of thing the "No Placeholders" rule exists to catch — rewrote Step 2 to ship the correct, complete `TextInputValidated`-based time field directly, and removed the now-unnecessary fix-up step rather than leave broken code as the primary artifact of any step.
- **Type/name consistency check:** `create_household_and_pet`'s SQL parameter names (`household_timezone`, `pet_name`, `pet_breed`, `pet_sex`, `pet_birthdate`, `pet_birthdate_is_approximate`, `pet_photo_url`, `feeding_times`) match exactly what Task 8's `supabase.rpc()` call passes; `feeding_times` as `jsonb` with `scheduledTime`/`label` keys matches what the SQL function reads via `->>'scheduledTime'`/`->>'label'`. `useOnboardingStore`'s `PetDetails`/`FeedingTime` types are used identically across Tasks 4, 7, and 8.
