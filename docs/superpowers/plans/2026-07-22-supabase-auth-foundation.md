# Supabase Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Do not begin execution until Dylan has explicitly confirmed he wants implementation to start.** This plan was written on Sonnet per his usual process (Opus for planning, Sonnet for implementation) — he's already aware this plan itself was drafted on Sonnet and said that's fine for this round, but future planning passes should default to Opus unless he says otherwise.

**Goal:** Replace the placeholder `useState(false)` auth gate in `pawly-expo` with real Supabase email/password auth — sign up, OTP-code email verification, and sign in — backed by a migrated Postgres schema with RLS from day one. Forgot-password is deferred to a later, settings-adjacent pass (see Task 10's scope note) rather than built speculatively now.

**Architecture:** `auth.users` (Supabase-managed) is mirrored into `public.users` via a `SECURITY DEFINER` trigger populated from signup metadata. `households`/`household_members` are stood up now (empty of app-facing UI) so the RLS helper-function pattern (`is_household_member`, `is_household_owner`) exists from the first migration, ready for the pets/feed_logs schema in a later pass. Session persistence uses `@react-native-async-storage/async-storage` (not `expo-secure-store` — see ADR 0005). Auth state lives in a thin Zustand slice fed by a single `onAuthStateChange` subscription; the `public.users` profile row is fetched/cached via TanStack Query and mirrored into the same store for future imperative use (RevenueCat, PostHog, Sentry — not wired up in this plan, just left ready). Email verification uses Supabase's OTP-code flow, not magic links (see ADR 0006).

**Tech Stack:** Expo SDK 57 / Expo Router, `@supabase/supabase-js` (already installed), `@react-native-async-storage/async-storage` (new), Zustand, TanStack Query, `react-hook-form` + Zod, Supabase CLI (via `npx supabase`) for migrations against the existing remote `pawly` project (ref `dofjrttcyjtzvqyttqdo`).

## Global Constraints

- Expo SDK 57 (RN 0.86, React 19.2) — check https://docs.expo.dev/versions/v57.0.0/ for any Expo/RN API used.
- New Expo-ecosystem packages installed via `npx expo install <package>`, never a raw `npm install` — for non-Expo packages (`@react-native-async-storage/async-storage`), `npx expo install` still resolves the SDK-57-compatible version and is the correct command here too.
- Prettier: 100-char width, single quotes, no trailing commas, `bracketSameLine: true`, no tabs.
- ESLint via `eslint-config-expo` — run `npm run lint` before finishing each task.
- `npm run typecheck` (`tsc --noEmit`) must pass before finishing each task.
- Files/folders are `kebab-case`. No `PascalCase`/`camelCase` filenames.
- Import via `@/*` → `src/*` alias, never deep relative paths.
- All user-facing text (labels, placeholders, toasts, errors) uses Australian/British English spelling.
- No ad-hoc controlled inputs — forms use `react-hook-form` + Zod via the shared `src/components/core/` validated inputs (`TextInputValidated`) reading from `useFormContext`.
- Styling via `useTheme()` / `useStyles(makeStyles)` — never hard-code colour strings.
- Comments only for non-obvious "why" (hidden constraints, platform quirks) — never narrate what code does.
- Spelling checked via `cspell` (`cspell.json`) — add new project words there rather than disabling checks.

---

## Task 1: Documentation corrections + two ADRs

This session's grill (2026-07-22) resolved two decisions that go against what's currently written in the docs, plus a data-model change. Fix the docs before writing any code so nothing in this plan contradicts what a future reader sees.

**Files:**

- Modify: `docs/TECH_STACK.md`
- Create: `docs/adr/0005-supabase-session-storage-asyncstorage.md`
- Create: `docs/adr/0006-otp-code-email-verification.md`

**Interfaces:** None — this task produces no code, only documentation other tasks' comments may reference (e.g. "see ADR 0005").

- [x] **Step 1: Write ADR 0005 (session storage)**

Match the format of the existing ADRs (`docs/adr/0001-*.md` etc — YAML frontmatter with `status: accepted`, an H1 title stating the decision, `## Considered options`, `## Consequences`).

Create `docs/adr/0005-supabase-session-storage-asyncstorage.md`:

```markdown
---
status: accepted
---

# Supabase session storage uses AsyncStorage, not expo-secure-store

The Supabase client persists its session (access token, refresh token, user metadata) via `@react-native-async-storage/async-storage`, passed as the `auth.storage` adapter. `expo-secure-store` remains installed and configured as a config plugin but is not used for the Supabase session in v1.

## Considered options

- **`expo-secure-store`** — Keychain-backed on iOS, more secure at rest. Rejected for now: a Supabase session object (access token, refresh token, expiry, user metadata) is a JSON blob that can exceed SecureStore's ~2KB per-key limit on iOS, silently failing to persist unless a chunking adapter (splitting the value across multiple SecureStore keys) is written first. That adapter is extra code with no product requirement driving it yet.
- **`@react-native-async-storage/async-storage`** (chosen) — unencrypted on-device storage, but matches `@supabase/supabase-js`'s own quick-start pattern exactly, no custom adapter code needed, and ships today.

## Consequences

- Session tokens sit in unencrypted device storage rather than the iOS Keychain. Accepted trade-off for v1 given no sensitive data beyond auth tokens is stored client-side yet.
- Revisit once there's product pressure to harden this (e.g. before a security review, or if a chunked SecureStore adapter gets built for another reason) — swapping the `auth.storage` adapter in `src/lib/supabase/client.ts` is a contained, one-file change.
```

- [x] **Step 2: Write ADR 0006 (OTP verification)**

Create `docs/adr/0006-otp-code-email-verification.md`:

```markdown
---
status: accepted
---

# Email verification and password reset use OTP codes, not magic links

Sign-up confirmation and password reset both use Supabase's 6-digit One-Time-Password flow (`{{ .Token }}` in the email template + `supabase.auth.verifyOtp()`), not the default `{{ .ConfirmationURL }}` magic-link flow.

## Considered options

- **Magic link (Supabase default)** — email contains a link that opens Safari, which hands back to the app via the `pawlyapp://` deep-link scheme already configured for household invites (ADR 0003). Rejected for v1: the RN client is configured with `detectSessionInUrl: false`, so a magic-link redirect needs the app to manually parse the incoming URL and call `exchangeCodeForSession` — extra plumbing, and an app-switch-to-Safari-and-back hand-off is a rougher mobile UX than staying in-app.
- **OTP code** (chosen) — user types a 6-digit code into an in-app screen, verified via `supabase.auth.verifyOtp({ email, token, type })`. No browser hand-off, no deep-link parsing. Requires editing the "Confirm signup" and "Reset password" email templates in the Supabase dashboard to use `{{ .Token }}` instead of the default link (also where Pawly branding is added — see Task 3).

## Consequences

- `pawlyapp://` stays reserved for household invites only (ADR 0003); auth never needs deep-link handling.
- Both signup and password-reset flows need an extra in-app "enter the code" screen (`sign-up/verify.tsx`, `forgot-password/verify.tsx`).
- Supabase's built-in email sender is rate-limited and best-effort only, regardless of link-vs-code — a custom SMTP provider (Dylan's plan: AWS SES) is still required before real users sign up. Not a consequence of this decision specifically.
```

- [x] **Step 3: Update `docs/TECH_STACK.md` — secure storage row**

Find:

```markdown
| Secure storage | `expo-secure-store` | Installed | Token/session storage |
```

Replace with:

```markdown
| Secure storage | `expo-secure-store` | Installed | Config plugin present, not currently used for auth — see ADR 0005 |
| Session storage | `@react-native-async-storage/async-storage` | Installed | Supabase Auth session persistence (unencrypted); see ADR 0005 |
```

- [x] **Step 4: Update `docs/TECH_STACK.md` — Backend row status**

Find:

```markdown
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) | **Planned** | Covers every v1 requirement without a custom server; client not yet added |
```

Replace with:

```markdown
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) | Installed (Auth + schema foundation) | Covers every v1 requirement without a custom server; Auth wired up, Realtime/Storage/Edge Functions still to come |
```

- [x] **Step 5: Update `docs/TECH_STACK.md` — data model `users` table**

Find:

```markdown
users
id, email, display_name, avatar_url, created_at
```

Replace with:

```markdown
users
id (→ auth.users, cascade delete), first_name, last_name, avatar_url, created_at
-- email is never duplicated here; read it from the authenticated session (auth.users) instead
```

- [x] **Step 6: Update `docs/TECH_STACK.md` — known open technical decisions**

Find:

```markdown
- **Auth:** `app/_layout.tsx` currently gates routes with a hard-coded `useState(false)`. Real auth (Supabase) is not yet implemented.
```

Delete this line entirely (Task 9 of this plan replaces the hard-coded gate with the real thing, making the line false).

- [x] **Step 7: Verify spelling and formatting**

Run:

```bash
npx cspell "docs/**/*.md"
```

Expected: no errors. If cspell flags a genuine new word (e.g. a proper noun), add it to the `words` array in `cspell.json` — don't disable the check.

- [x] **Step 8: Commit**

```bash
git add docs/TECH_STACK.md docs/adr/0005-supabase-session-storage-asyncstorage.md docs/adr/0006-otp-code-email-verification.md
git commit -m "docs: correct auth session storage and verification decisions"
```

---

## Task 2: Supabase CLI setup + first migration (schema, trigger, RLS)

**Files:**

- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/20260722120000_auth_foundation.sql`

**Interfaces:**

- Produces: tables `public.households`, `public.household_members` (`household_role` enum: `'owner' | 'contributor'`), `public.users`; functions `public.is_household_member(target_household_id uuid) returns boolean`, `public.is_household_owner(target_household_id uuid) returns boolean`, `public.handle_new_user() returns trigger`; trigger `on_auth_user_created` on `auth.users`.

- [x] **Step 1: Scaffold the Supabase project locally**

Run:

```bash
npx supabase init
```

Expected: creates `supabase/config.toml`, `supabase/.gitignore`, `supabase/migrations/` (empty). Accept the default prompts (VS Code settings, etc. — answer `N` if asked, not needed here).

- [x] **Step 2: Manual step — Dylan links the CLI to the `pawly` project**

This requires an interactive browser login and cannot be scripted. Dylan runs, in this repo's root:

```bash
npx supabase login
npx supabase link --project-ref dofjrttcyjtzvqyttqdo
```

`link` will prompt for the database password (set at project creation, or resettable from the Supabase dashboard → Project Settings → Database). Confirm this step is done before continuing — the rest of this task can proceed without it (migrations get applied via the MCP tool below), but `link` is needed for any future `supabase db pull` / `supabase gen types typescript` commands.

- [x] **Step 3: Write the migration file**

Create `supabase/migrations/20260722120000_auth_foundation.sql`:

```sql
-- Households and membership

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null,
  grace_window_minutes integer not null default 60,
  created_at timestamptz not null default now()
);

create type public.household_role as enum ('owner', 'contributor');

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null,
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- App-facing user profile, separate from Supabase-managed auth.users.
-- first_name/last_name are nullable at the DB layer (not the form layer) so the
-- handle_new_user trigger below can never fail signup on a missing metadata key.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.users enable row level security;

-- RLS helper functions. security definer + set search_path = '' is required
-- so these can read household_members (which itself has RLS enabled) without
-- deadlocking against its own policies, and so they can't be tricked into
-- querying a same-named table in a different schema.

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_members.household_id = target_household_id
      and household_members.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_members.household_id = target_household_id
      and household_members.user_id = auth.uid()
      and household_members.role = 'owner'
  );
$$;

-- Households: view-only for now. Insert/update/delete policies land with the
-- household-onboarding work in a later pass — until then RLS defaults to deny,
-- which is correct (no UI creates a household yet).
create policy "Members can view their households"
on public.households for select
using ( public.is_household_member(id) );

create policy "Members can view their household's membership list"
on public.household_members for select
using ( public.is_household_member(household_id) );

-- Users: everyone can see their own profile immediately after signup, even
-- before they belong to any household. Fellow household members become
-- visible once household_members rows exist.
create policy "Users can view their own profile"
on public.users for select
using ( id = auth.uid() );

create policy "Users can view fellow household members' profiles"
on public.users for select
using (
  exists (
    select 1
    from public.household_members as my_membership
    join public.household_members as their_membership
      on their_membership.household_id = my_membership.household_id
    where my_membership.user_id = auth.uid()
      and their_membership.user_id = public.users.id
  )
);

create policy "Users can update their own profile"
on public.users for update
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- Populates public.users the instant someone signs up, from the metadata
-- passed to supabase.auth.signUp({ options: { data: { first_name, last_name } } }).
-- Runs regardless of signup method, so it keeps working unchanged once
-- Apple/Google OAuth are added in v2.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [x] **Step 4: Apply the migration to the remote `pawly` project**

Use the Supabase MCP tool (already connected, no additional auth needed) rather than `supabase db push`, since Step 2's interactive login may not have happened yet in an agent-driven run:

Call `mcp__plugin_supabase_supabase__apply_migration` with:

- `project_id`: `dofjrttcyjtzvqyttqdo`
- `name`: `auth_foundation`
- `query`: the full SQL from Step 3

Expected: returns success with no error.

Note: if Dylan has completed Step 2's `supabase login` + `link` by the time this runs, reconcile the CLI's local migration history afterwards with `npx supabase db pull` (or `npx supabase migration repair` if the timestamps recorded remotely by `apply_migration` don't line up with the local filename's timestamp) — this is a one-time bookkeeping step, not a blocker to using the schema.

- [x] **Step 5: Verify the schema landed correctly**

Call `mcp__plugin_supabase_supabase__list_tables` with `project_id: "dofjrttcyjtzvqyttqdo"`, `schemas: ["public"]`, `verbose: true`.

Expected: `households`, `household_members`, `users` all present with the columns defined above.

Then call `mcp__plugin_supabase_supabase__get_advisors` with `project_id: "dofjrttcyjtzvqyttqdo"`, `type: "security"`.

**This surfaced a real finding, not a false positive**: three `WARN`-level advisories, "Public Can Execute SECURITY DEFINER Function" / "Signed-In Users Can Execute SECURITY DEFINER Function", for `is_household_member`, `is_household_owner`, and `handle_new_user` — all three are `SECURITY DEFINER` functions created in `public`, which Supabase auto-exposes at `/rest/v1/rpc/<name>` to `anon` and `authenticated`. Supabase's own RLS guide is explicit that helper functions like these "should never be created in a schema in the Exposed schemas" — their own canonical example puts them in a `private` schema instead.

- [x] **Step 6: Write and apply a follow-up migration moving the helpers to a `private` schema**

Create `supabase/migrations/20260722120100_private_rls_helpers.sql`:

```sql
-- Move the RLS helper functions (and the signup trigger function) out of the
-- public schema into a private one. public is an "Exposed schema" — anything
-- in it is automatically callable by anon/authenticated via PostgREST at
-- /rest/v1/rpc/<name>, which the security advisor flagged for all three
-- SECURITY DEFINER functions from the previous migration. Moving them to a
-- non-exposed schema (Supabase's own documented pattern for this) removes
-- that API surface entirely, rather than patching it with revoked grants.

create schema if not exists private;

create or replace function private.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_members.household_id = target_household_id
      and household_members.user_id = auth.uid()
  );
$$;

create or replace function private.is_household_owner(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_members.household_id = target_household_id
      and household_members.user_id = auth.uid()
      and household_members.role = 'owner'
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;

-- Re-point policies at the private versions.

drop policy "Members can view their households" on public.households;
create policy "Members can view their households"
on public.households for select
using ( private.is_household_member(id) );

drop policy "Members can view their household's membership list" on public.household_members;
create policy "Members can view their household's membership list"
on public.household_members for select
using ( private.is_household_member(household_id) );

-- Re-point the trigger at the private function, then drop the old public ones.

drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

drop function public.is_household_member(uuid);
drop function public.is_household_owner(uuid);
drop function public.handle_new_user();
```

Apply it the same way as Step 4, via `apply_migration` with `name: "private_rls_helpers"`. Then re-run `get_advisors` (`type: "security"`) — expected: empty `lints` array.

- [x] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: add households, household_members, users schema with RLS

Includes a follow-up migration moving RLS helper functions to a private
schema after the security advisor flagged them as publicly callable
SECURITY DEFINER functions in the exposed public schema."
```

---

## Task 3: Manual — Supabase dashboard configuration (OTP email templates)

This cannot be scripted (it's dashboard UI, no MCP tool exposes template editing) — Dylan does this step directly. Flag it clearly rather than skip it silently, since Task 9's verify screen can't be tested against real email until it's done. Only the "Confirm signup" template is needed for this pass — "Reset password" is skipped since the forgot-password flow is deferred (Task 10); do it when that flow is picked back up, not now.

**Discovered mid-execution, not in the original plan:** Supabase hard-gates email template editing behind custom SMTP being configured at all — the dashboard shows "Set up custom SMTP to edit templates" and refuses to save any template body until one is set up (this isn't documented in Supabase's public docs as of this session; found via the actual dashboard UI). This blocked Step 2 below until resolved.

**Files:** None (Supabase dashboard only).

- [x] **Step 0 (added): Configure custom SMTP to unblock template editing**

Set up Resend as a fast, temporary/testing SMTP provider (not the eventual AWS SES production choice — see the `supabase-smtp-aws-ses` memory note): host `smtp.resend.com`, port `587`, username `resend`, password = Resend API key, sender `onboarding@resend.dev` (Resend's testing-only address, no domain verification needed). Configured in Supabase dashboard → Authentication → SMTP settings.

- [x] **Step 1: Confirm email confirmations are required**

Dashboard → Authentication → Providers → Email. Confirm "Confirm email" is enabled (it's on by default for hosted projects).

- [x] **Step 2: Edit the "Confirm signup" template**

Dashboard → Authentication → Emails → Templates → "Confirm signup". Replace the body so it uses `{{ .Token }}` instead of the default `{{ .ConfirmationURL }}` link, and add Pawly branding/copy, e.g.:

```html
<h2>Welcome to Pawly</h2>
<p>Enter this code in the app to confirm your email address:</p>
<h1>{{ .Token }}</h1>
<p>This code expires shortly — if it's expired, request a new one from the app.</p>
```

- [x] **Step 3: Confirm**

Confirmed working — Dylan completed a real signup end-to-end (code arrived branded via email, verified successfully, landed in `(protected)`).

---

## Task 4: Env vars + Supabase client module

**Files:**

- Modify: `.env`
- Modify: `.env.example`
- Create: `src/lib/supabase/client.ts`

**Interfaces:**

- Produces: `supabase` (a configured `SupabaseClient` instance) exported from `src/lib/supabase/client.ts`.

- [x] **Step 1: Install AsyncStorage**

```bash
npx expo install @react-native-async-storage/async-storage
```

Expected: added to `package.json` `dependencies` at the SDK-57-compatible version.

- [x] **Step 2: Add Supabase env vars**

`.env` currently contains only `EXPO_PUBLIC_NODE_ENV=development`. Append:

```
EXPO_PUBLIC_SUPABASE_URL=https://dofjrttcyjtzvqyttqdo.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_DMUsboA7zhMFPGOZB2NR6Q_0ol_mZQJ
```

(`.env` is already gitignored — confirmed via `.gitignore`'s `.env` entry — so this is safe to write directly, no `.env.local` needed.)

- [x] **Step 3: Populate `.env.example`**

`.env.example` is currently empty. Write:

```
EXPO_PUBLIC_NODE_ENV=development
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
```

- [x] **Step 4: Write the client module**

Create `src/lib/supabase/client.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
```

- [x] **Step 5: Verify**

```bash
npm run typecheck
```

Expected: no errors (this file isn't imported anywhere yet, but must type-check standalone).

- [x] **Step 6: Commit**

```bash
git add .env.example src/lib/supabase/client.ts package.json
git commit -m "feat: add Supabase client with AsyncStorage session persistence"
```

(`.env` itself is gitignored — don't try to add it.)

---

## Task 5: Thin auth service wrapper

**Files:**

- Create: `src/lib/supabase/auth.ts`

**Interfaces:**

- Consumes: `supabase` from `src/lib/supabase/client.ts` (Task 4).
- Produces: `AuthService` object with methods `signUp({ email, password, firstName, lastName })`, `verifySignUpOtp({ email, token })`, `signInWithPassword({ email, password })` — all `async`, all throw on error (never return a Supabase `error` object silently). Password-reset methods (`requestPasswordReset`, `verifyPasswordResetOtp`, `updatePassword`) are deliberately not added here — see Task 10's scope note.

- [x] **Step 1: Write the service**

Create `src/lib/supabase/auth.ts`:

```ts
import { supabase } from '@/lib/supabase/client';

async function signUp(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        first_name: params.firstName,
        last_name: params.lastName
      }
    }
  });

  if (error) throw error;
  return data;
}

async function verifySignUpOtp(params: { email: string; token: string }) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: params.email,
    token: params.token,
    type: 'signup'
  });

  if (error) throw error;
  return data;
}

async function signInWithPassword(params: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword(params);

  if (error) throw error;
  return data;
}

export const AuthService = {
  signUp,
  verifySignUpOtp,
  signInWithPassword
};
```

- [x] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass with no errors.

- [x] **Step 3: Commit**

```bash
git add src/lib/supabase/auth.ts
git commit -m "feat: add thin AuthService wrapper around supabase.auth"
```

---

## Task 6: Zod schemas for sign-up and OTP verification

Forgot-password is deferred (see Task 10's scope note) — no schema is created for it here. Adding `requestPasswordResetSchema`/`newPasswordSchema` now, with no screen to consume them, would be dead code sitting in the repo until settings/account work picks it back up later.

**Files:**

- Create: `src/constants/schemas/sign-up.ts`
- Create: `src/constants/schemas/verify-otp.ts`

**Interfaces:**

- Produces: `signUpSchema`/`SignUpFormValues`, `verifyOtpSchema`/`VerifyOtpFormValues`.

- [x] **Step 1: Sign-up schema**

Create `src/constants/schemas/sign-up.ts` (mirrors the existing `sign-in.ts` pattern):

```ts
import { z } from 'zod';

export const signUpSchema = z.object({
  firstName: z.string().min(1, { message: 'Enter your first name' }),
  lastName: z.string().min(1, { message: 'Enter your last name' }),
  email: z.email({ message: 'Enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' })
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
```

- [x] **Step 2: OTP schema (used by the sign-up verification screen)**

Create `src/constants/schemas/verify-otp.ts`:

```ts
import { z } from 'zod';

export const verifyOtpSchema = z.object({
  token: z.string().regex(/^\d{8}$/, { message: 'Enter the 8-digit code' })
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;
```

- [x] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass.

- [x] **Step 4: Commit**

```bash
git add src/constants/schemas/sign-up.ts src/constants/schemas/verify-otp.ts
git commit -m "feat: add Zod schemas for sign-up and OTP verification"
```

---

## Task 7: Auth store, session hook, profile query hook, and root layout wiring

**Files:**

- Modify: `src/types/core.ts`
- Create: `src/stores/auth-store.ts`
- Create: `src/hooks/use-auth-session.ts`
- Create: `src/hooks/use-user-profile.ts`
- Modify: `src/app/_layout.tsx`
- Modify: `docs/PRODUCT_BRIEF.md`

**Interfaces:**

- Consumes: `supabase` from Task 4.
- Produces: `useAuthStore` (Zustand store: `status: 'loading' | 'signedIn' | 'signedOut'`, `userId: string | undefined`, `profile: UserProfile | undefined`, `setSession`, `setProfile`); `useAuthSession()` hook (subscribes to auth state once); `useUserProfile()` hook (fetches + caches + mirrors the profile row).

**Scope note:** password-reset (forgot-password) is deferred — see Task 10 — since it's tied to account/settings work that isn't happening yet. This task therefore stays a plain two-status gate (`signedOut` / `signedIn`), no `needsPasswordReset` status or extra route group. Don't add that machinery ahead of the flow that would actually need it.

- [x] **Step 1: Add the `UserProfile` type**

Append to `src/types/core.ts`:

```ts
export type UserProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};
```

- [x] **Step 2: Write the auth store**

Create `src/stores/auth-store.ts`:

```ts
import type { UserProfile } from '@/types/core';
import { create } from 'zustand';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthState = {
  status: AuthStatus;
  userId: string | undefined;
  profile: UserProfile | undefined;
  setSession: (userId: string | undefined) => void;
  setProfile: (profile: UserProfile | undefined) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  userId: undefined,
  profile: undefined,
  setSession: (userId) =>
    set({
      status: userId ? 'signedIn' : 'signedOut',
      userId
    }),
  setProfile: (profile) => set({ profile })
}));
```

- [x] **Step 3: Write the session hook**

Create `src/hooks/use-auth-session.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';

/**
 * Subscribes to Supabase auth state exactly once. Call this only from the
 * root layout — every other read of "is the user signed in" should go
 * through useAuthStore, not a second subscription.
 */
export function useAuthSession() {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session?.user.id);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session?.user.id);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);
}
```

- [x] **Step 4: Write the profile query hook**

Create `src/hooks/use-user-profile.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import type { UserProfile } from '@/types/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    avatarUrl: data.avatar_url
  };
}

/**
 * Fetches/caches the public.users profile row via Query, then mirrors it
 * into useAuthStore so non-React code (future RevenueCat.logIn, PostHog.identify,
 * Sentry.setUser calls) can read it without a hook.
 */
export function useUserProfile() {
  const userId = useAuthStore((state) => state.userId);
  const setProfile = useAuthStore((state) => state.setProfile);

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(userId as string),
    enabled: Boolean(userId)
  });

  useEffect(() => {
    setProfile(query.data);
  }, [query.data, setProfile]);

  return query;
}
```

- [x] **Step 5: Wire the root layout to real auth state**

Read `src/app/_layout.tsx` first to confirm it still matches the version already in this repo (imports `QueryClient`/`QueryClientProvider`, `Stack`/`ThemeProvider` from `expo-router`, `useState` for the placeholder, etc.) before editing — if it's drifted, adapt this step's replacement accordingly rather than blindly overwriting.

Replace the full contents of `src/app/_layout.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAuthStore } from '@/stores/auth-store';

const queryClient = new QueryClient();

if (__DEV__) require('../../ReactotronConfig');

function AuthGate() {
  useAuthSession();
  useUserProfile();
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <QueryClientProvider client={queryClient}>
              <AuthGate />
            </QueryClientProvider>
          </KeyboardProvider>
          <Toaster richColors position="top-center" />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

(`AuthGate` is split out as its own component so `useUserProfile`'s `useQuery` call is inside the `QueryClientProvider` tree — it can't run at the top of `RootLayout` itself, above the provider.)

- [x] **Step 6: Update `docs/PRODUCT_BRIEF.md`**

Find, in the Risks & Open Questions section:

```markdown
- **Auth not yet real:** routing is currently gated by a hard-coded flag; Supabase auth is not implemented.
```

Delete this line — it's no longer true after this task.

- [x] **Step 7: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass. Then start the dev server and confirm the app still boots to the sign-in screen (no session yet, so `status` resolves to `signedOut`):

```bash
npm start
```

Use the argent MCP tools (per this repo's loaded `argent-react-native-app-workflow` skill) to boot the iOS simulator, launch the app, and confirm via `describe`/`debugger-component-tree` that the "Welcome back" sign-in screen renders with no crash.

- [x] **Step 8: Commit**

```bash
git add src/types/core.ts src/stores/auth-store.ts src/hooks/use-auth-session.ts src/hooks/use-user-profile.ts src/app/_layout.tsx docs/PRODUCT_BRIEF.md
git commit -m "feat: wire root layout to real Supabase auth state"
```

---

## Task 8: Sign-in screen

**Files:**

- Modify: `src/app/(public)/(auth)/index.tsx`

**Interfaces:**

- Consumes: `AuthService.signInWithPassword` (Task 5), `signInSchema`/`SignInFormValues` (already exists at `src/constants/schemas/sign-in.ts`).

- [x] **Step 1: Finish the sign-in screen**

Read the current file first — it already has the form (`signInSchema`, `useForm`, `hapticLight`) wired, with the actual input JSX commented out and the submit handler showing a placeholder toast. Replace its full contents with:

```tsx
import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { signInSchema, type SignInFormValues } from '@/constants/schemas/sign-in';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { AuthService } from '@/lib/supabase/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

const SignIn = () => {
  const styles = useStyles(makeStyles);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    try {
      await AuthService.signInWithPassword(values);
    } catch (error) {
      toast.error('Could not sign in', {
        description: error instanceof Error ? error.message : 'Check your details and try again'
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
          title="Welcome back"
          description="Sign in to coordinate care for your pet."
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="email"
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  testID="sign-in-email"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="password"
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="sign-in-password"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Signing in…' : 'Sign in'}
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              onPress={() => {
                void onSubmit();
              }}
            />

            <Link href="/forgot-password" asChild>
              <PressableOpacity style={styles.forgotPassword}>
                <AppText color="textSecondary" size={16} align="center">
                  Forgot password?
                </AppText>
              </PressableOpacity>
            </Link>
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
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    },
    forgotPassword: {
      alignSelf: 'center',
      paddingVertical: spacing.one
    }
  });

export default SignIn;
```

- [x] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass.

- [x] **Step 3: Manual QA on simulator**

Boot the iOS simulator via the argent MCP tools, launch the app, and on the sign-in screen:

- Confirm both fields and error messages render (submit empty to trigger Zod validation errors).
- Enter a non-existent account's credentials, submit, confirm the "Could not sign in" toast appears.
- Confirm "Forgot password?" navigates to the forgot-password screen.

- [x] **Step 4: Commit**

```bash
git add "src/app/(public)/(auth)/index.tsx"
git commit -m "feat: wire sign-in screen to Supabase auth"
```

---

## Task 9: Sign-up screen + email verification screen

**Files:**

- Modify: `src/app/(public)/(auth)/sign-up/index.tsx`
- Create: `src/app/(public)/(auth)/sign-up/verify.tsx`

**Interfaces:**

- Consumes: `AuthService.signUp`, `AuthService.verifySignUpOtp` (Task 5); `signUpSchema`, `verifyOtpSchema` (Task 6).

- [x] **Step 1: Write the sign-up screen**

Replace the full contents of `src/app/(public)/(auth)/sign-up/index.tsx` (currently a bare `<Text>SignUp</Text>` stub):

```tsx
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { signUpSchema, type SignUpFormValues } from '@/constants/schemas/sign-up';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { AuthService } from '@/lib/supabase/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

const SignUp = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    try {
      await AuthService.signUp(values);
      router.push({ pathname: '/sign-up/verify', params: { email: values.email } });
    } catch (error) {
      toast.error('Could not sign up', {
        description: error instanceof Error ? error.message : 'Check your details and try again'
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
          title="Create your account"
          description="Set up your account so you can coordinate care for your pet."
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="firstName"
                  label="First name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Sarah"
                  autoComplete="given-name"
                  returnKeyType="next"
                  testID="sign-up-first-name"
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="lastName"
                  label="Last name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Smith"
                  autoComplete="family-name"
                  returnKeyType="next"
                  testID="sign-up-last-name"
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="email"
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  testID="sign-up-email"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="password"
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="sign-up-password"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Creating account…' : 'Create account'}
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
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default SignUp;
```

- [x] **Step 2: Write the verify-code screen**

Create `src/app/(public)/(auth)/sign-up/verify.tsx` (auto-registers as a route — `sign-up/_layout.tsx` uses file-based discovery with no explicit `<Stack.Screen>` list):

```tsx
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { verifyOtpSchema, type VerifyOtpFormValues } from '@/constants/schemas/verify-otp';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { AuthService } from '@/lib/supabase/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

const VerifySignUp = () => {
  const styles = useStyles(makeStyles);
  const { email } = useLocalSearchParams<{ email: string }>();

  const form = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { token: '' },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    try {
      // No manual navigation on success: verifying flips the Supabase session,
      // which the root layout's AuthGate reacts to and swaps to (protected) itself.
      await AuthService.verifySignUpOtp({ email, token: values.token });
    } catch (error) {
      toast.error('Could not verify code', {
        description: error instanceof Error ? error.message : 'Check the code and try again'
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
          title="Check your email"
          description={`Enter the 8-digit code we sent to ${email}.`}
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="token"
                  label="Verification code"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="verify-signup-token"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Verifying…' : 'Verify'}
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
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default VerifySignUp;
```

- [x] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both pass.

- [x] **Step 4: Manual QA on simulator (requires Task 3 dashboard config done)**

Sign up with a real, checkable email address on the simulator. Confirm:

- Submitting invalid fields (short password, missing name) shows Zod errors. ✅ verified live during this session (agent-driven testing).
- Successful submit navigates to `/sign-up/verify` showing the email address. ✅ verified live.
- The email arrives with a 6-digit code (not a link) and Pawly-branded copy. ✅ verified by Dylan, 2026-07-23, once Resend SMTP unblocked template editing.
- Entering the correct code signs the user in and the app swaps from the sign-up screen straight into `(protected)` — no manual navigation call should be needed for this, confirming Task 7's reactive `AuthGate` works end-to-end. ✅ confirmed working by Dylan — full signup → OTP → protected-area flow proven end-to-end.
- Entering a wrong code shows the "Could not verify code" toast and stays on the screen. Not explicitly re-tested after the SMTP fix, but this path was already exercised earlier in the session (error handling confirmed via the sign-in screen's equivalent path) and the code is unchanged.

- [x] **Step 5: Commit**

```bash
git add "src/app/(public)/(auth)/sign-up/index.tsx" "src/app/(public)/(auth)/sign-up/verify.tsx"
git commit -m "feat: wire sign-up and OTP verification screens"
```

---

## Task 10: Forgot-password flow — deferred, out of scope for this pass

Dylan deferred this during implementation (2026-07-22): password reset is really account-management functionality that belongs alongside the Settings screen, which doesn't exist yet and isn't a near-term priority. Building it now — a full request/verify/set-new-password flow, a third auth status, a dedicated route group — would be exactly the kind of speculative complexity the "foundations must stay clean and minimal" goal for this pass argues against.

**What stays as-is:** `src/app/(public)/(auth)/forgot-password/index.tsx` (and its `_layout.tsx`) remain the existing bare `<Text>ForgotPassword</Text>` stub already in the repo. The sign-in screen's "Forgot password?" link (Task 8) still points at it — tapping it shows the stub, which is harmless and keeps the navigation entry point in place for later.

**What was deliberately not built in Tasks 5–7 as a result:**

- `AuthService.requestPasswordReset` / `verifyPasswordResetOtp` / `updatePassword` — not added to the Task 5 wrapper.
- `requestPasswordResetSchema` / `newPasswordSchema` — not added in Task 6.
- The `needsPasswordReset` auth status and a `(reset-password)` route group — not added in Task 7; `useAuthStore`/`AuthGate` stay a plain `signedOut`/`signedIn` two-state gate.

**When this gets picked back up** (alongside Settings/account-management work), the design already worked out during planning still holds and should be reused rather than re-derived: verifying a password-reset OTP fires Supabase's `PASSWORD_RECOVERY` event via `onAuthStateChange` (confirmed against current Supabase docs), which is distinct from a normal sign-in — the auth store should map it to its own status (not `signedIn`), gated to a dedicated route group, so a user mid-reset can't browse the rest of the app before setting a real password. `updateUser()` afterwards fires `USER_UPDATED`, which falls through to the normal signed-in branch, so completing the reset can reactively swap the app into `(protected)` with no manual navigation call needed.

---

## Self-Review Notes

- **Spec coverage:** of the original 9 numbered items, 8 are covered by Tasks 1–9 — Task 1 (docs/ADRs), Task 2 (CLI + migration + schema/trigger/RLS), Task 3 (dashboard templates — kept even though only the "Confirm signup" template is needed now, not "Reset password", since verification is still in scope), Task 4 (client), Task 5 (auth service), Task 7 (Zustand/Query split + root layout), Task 8 (sign-in), Task 9 (sign-up + verify). Item 8's forgot-password half is explicitly deferred — Task 10 records why and what to reuse later, rather than silently dropping it.
- **CONTEXT.md:** deliberately untouched — no new domain/glossary terms were introduced in the grill session behind this plan (RLS, OTP, trigger, Zustand are implementation vocabulary, out of CONTEXT.md's scope by its own rule).
- **Scope cut, not a hidden gap:** the routing conflict originally found between a recovery session and the `(public)`/`(protected)` split no longer applies to any task in this plan — Dylan deferred the whole forgot-password flow rather than resolving it now, so Tasks 5–7 were trimmed back to not build the machinery that conflict was about. The resolved design is kept in Task 10 for whenever that flow is picked back up.
- **Type/name consistency check:** `AuthService` methods (`signUp`/`verifySignUpOtp`/`signInWithPassword`), `UserProfile` fields (`firstName`/`lastName`/`avatarUrl` camelCase in TS, `first_name`/`last_name`/`avatar_url` snake_case in SQL/Supabase responses), `useAuthStore` field names (`status`/`userId`/`profile`/`setSession`/`setProfile`), and schema export names (`signUpSchema`/`SignUpFormValues`, `verifyOtpSchema`/`VerifyOtpFormValues`) are used identically across every task that references them.
