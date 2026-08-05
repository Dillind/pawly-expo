<!-- cspell:ignore ABCDEFGHJKLMNPQRSTUVWXYZ nosuchcode -->

# CRU-008 Household Invites — Implementation Plan

**Decisions:** read these first, they are the contract this plan implements.

- [ADR 0016](../../adr/0016-invites-redeem-by-manual-code.md) — why there is no deep link.
- [ADR 0017](../../adr/0017-household-lifecycle-creator-and-departure.md) — `created_by`, one household per User, departure.
- [ADR 0018](../../adr/0018-subscription-is-household-scoped.md) — billing, deferred but constrains nothing here.
- [ADR 0001](../../adr/0001-household-owns-pets-role-based-ownership.md) — the role model this sits on.
- `CONTEXT.md` — **Household Creator**, **Invite**, **Owner**, **Contributor**. Use these words exactly.

**Branch:** `feat/CRU-008-household-invites`, already created. The three ADRs, the `CONTEXT.md` and
`PRODUCT_BRIEF.md` edits, and a `cspell.json` entry are already written and uncommitted on it.

Read `AGENTS.md` before writing code. The Comments section in particular — comment the *why*, never
narrate a change.

**Goal, in one sentence:** a second person on a second physical device can install the app, create an
account, type a code, and land in the existing household as a Contributor.

That is also the acceptance test. Everything else in here exists to make that sentence true.

---

## Global constraints

- **No Supabase import outside `src/services/`.** Every remote call goes service → query hook →
  component.
- **The service owns snake_case.** No column name reaches a component.
- **Every user-facing string comes from `SuccessMessage` / `ErrorMessage` in `@/constants/enums`.**
  No string literals at call sites.
- **Toasts belong to the hook, not the call site**, and every `onError` also does
  `console.error(error)`.
- **Australian/British English** in all copy.
- **Invoke `/frontend-design` and `/expo-native-ui` before writing any UI** — Tasks 8 and 9. Before,
  not after.
- Destructure every TanStack hook result and rename as you go (`isPending: isGenerating`).

## Order matters

Tasks 1 → 4 are database, and they are strictly ordered. Task 1 adds the unique constraint that
Task 3's redeem RPC relies on to be honest about `already_in_household`; Task 2 creates the table
Task 3 reads. Do not start Task 5 until `execute_sql` has proved Tasks 1–4 behave.

Task 8 (onboarding fork) and Task 9 (Members screen) can be built in either order, but Task 9 is
where you can generate a code, and Task 8 is where you can spend one — you need both before the
device test in Task 12.

## Where the SQL runs

There is no local Supabase stack. Migrations in this repo have been applied to the **live `crumpet`
project** and this plan continues that.

Apply with the Supabase MCP `apply_migration` tool (name = filename without `.sql`), verify with
`execute_sql`, and write the same file into `supabase/migrations/` so the repo stays the source of
truth.

**You are operating on live data containing Dylan's real household.** Every verification step that
writes has an explicit revert. Run it.

---

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260805090000_household_creator_and_single_household.sql` | **Create.** `households.created_by`, backfill, `is_household_creator()`, `unique (user_id)` on `household_members`. |
| `supabase/migrations/20260805090100_household_invites.sql` | **Create.** The table, its RLS, and `private.generate_invite_code()`. |
| `supabase/migrations/20260805090200_invite_rpcs.sql` | **Create.** `create_household_invite()`, `revoke_household_invite()`, `redeem_household_invite()`. |
| `supabase/migrations/20260805090300_member_management_rpcs.sql` | **Create.** `remove_household_member()`, `change_household_member_role()`. |
| `src/services/household.service.ts` | **Modify.** Add invite and member-management functions. `listMembers` gains `isCreator`. |
| `src/hooks/queries/use-household-members.ts` | **Modify.** Already exists; keep the key. |
| `src/hooks/queries/use-household-invites.ts` | **Create.** Pending invites list. |
| `src/hooks/queries/use-invite-mutations.ts` | **Create.** Generate, revoke, redeem. |
| `src/hooks/queries/use-member-mutations.ts` | **Create.** Remove, change role. |
| `src/constants/enums.ts` | **Modify.** New `SuccessMessage` / `ErrorMessage` entries. |
| `src/types/core.ts` | **Modify.** `HouseholdInvite`, and extend `HouseholdMember` if that is where it lives. |
| `src/app/(protected)/(onboarding)/index.tsx` | **Create.** The Create-or-Join fork. Becomes the initial route. |
| `src/app/(protected)/(onboarding)/join.tsx` | **Create.** Code entry. |
| `src/app/(protected)/(onboarding)/_layout.tsx` | **Modify.** Register both, fork first. |
| `src/app/(protected)/(tabs)/profile/household.tsx` | **Create.** The Members screen. |
| `src/app/(protected)/(tabs)/profile/index.tsx` | **Modify.** A `Household` row above `Notifications`. |
| `src/components/screens/profile/member-row.tsx` | **Create.** One member, role, actions. |
| `src/components/screens/profile/pending-invite-row.tsx` | **Create.** A different shape to a member row. |
| `src/components/bottom-sheets/invite-sheet.tsx` | **Create.** Shows the generated code, shares it. |
| `src/components/ui/create-actions.ts` | **Modify.** Enable `Invite someone`. |
| `tests/services/household.service.test.ts` | **Create.** Column mapping, per AGENTS.md. |

---

## Task 1 — The Household Creator, and one household per User

Migration `20260805090000_household_creator_and_single_household.sql`.

### 1.1 The column

```sql
alter table public.households
  add column created_by uuid references auth.users(id) on delete restrict;
```

Nullable at first so the backfill can run.

**`on delete restrict` is deliberate and is not a placeholder to "fix".** ADR 0017 decides what
happens when a Creator leaves, and CRU-008 does not build it. Until it is built, an attempt to delete
a User who created a household must fail loudly at the database rather than quietly taking the
household — and everyone else's feed logs — with it. There is no delete-account UI today, so nothing
regresses.

### 1.2 Backfill

```sql
update public.households as h
set created_by = (
  select hm.user_id
  from public.household_members as hm
  where hm.household_id = h.id
    and hm.role = 'owner'
  order by hm.created_at asc, hm.id asc
  limit 1
);

alter table public.households alter column created_by set not null;
```

The `hm.id` tiebreak matters — `created_at` alone is not unique enough to be deterministic, and this
is the one and only time the Creator is ever inferred rather than recorded.

If `set not null` fails, a household has no owner. Stop and report it; do not invent one.

### 1.3 Record it going forward

`create_household_and_pet()` is the only thing that creates a household. Re-declare it with
`create or replace`, changing exactly one statement:

```sql
insert into public.households (id, name, timezone, created_by)
values (new_household_id, coalesce(owner_first_name, 'My') || '''s Household', household_timezone, auth.uid());
```

Copy the rest of the body verbatim from
`20260723090100_fix_create_household_and_pet_rls.sql`. Keep `security invoker`. Do **not** add
`returning` to the households insert — that migration's header explains at length why it breaks RLS.

### 1.4 The helper

```sql
create or replace function public.is_household_creator(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.households
    where households.id = target_household_id
      and households.created_by = auth.uid()
  );
$$;
```

Same shape as `is_household_member` / `is_household_owner` in the auth-foundation migration. Match it.

### 1.5 One household per User

```sql
alter table public.household_members
  add constraint household_members_one_household_per_user unique (user_id);
```

This makes true an assumption `src/services/household.service.ts:18` currently only hopes for. That
file uses `.limit(1)` with **no `order by`**, so two membership rows would return an arbitrary
household, possibly a different one per call. Leave the service code alone — the constraint is the
fix.

### 1.6 Verify

```sql
select id, name, created_by from public.households;
```

Expect one row, `created_by` = Dylan's user id. No revert needed; this is additive and correct.

---

## Task 2 — The invites table

Migration `20260805090100_household_invites.sql`.

```sql
create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz
);

create index household_invites_household_id_idx on public.household_invites (household_id);
```

Notes on the shape:

- **`code` is globally unique, forever.** A used or expired code is never reissued. Volume is tiny
  and the safety is free.
- **`redeemed_by` is `on delete set null`, not cascade.** If the redeemer later deletes their account
  the invite history should survive as "used", not vanish.
- No `updated_at`. Nothing edits an invite; it is created, then possibly stamped once.

### 2.1 Code generation

```sql
create or replace function private.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt integer := 0;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    exit when not exists (select 1 from public.household_invites where code = candidate);

    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'Could not generate a unique invite code';
    end if;
  end loop;

  return candidate;
end;
$$;
```

The alphabet has **no `I`, `O`, `0` or `1`** — the code gets read aloud and retyped, and those four
are where that goes wrong. 32 characters over 6 positions is about 1.07 billion codes; the collision
loop will effectively never spin.

Put it in `private`, matching the schema `20260722120100_private_rls_helpers.sql` established, and
revoke execute from `anon, authenticated`.

### 2.2 RLS

```sql
alter table public.household_invites enable row level security;

revoke all on public.household_invites from anon, authenticated;

create policy "Owners can view their household's invites"
on public.household_invites for select
to authenticated
using ( public.is_household_owner(household_id) );

grant select on public.household_invites to authenticated;
```

**No insert, update or delete grant of any kind.** Every write goes through an RPC in Task 3. This is
the same posture `household_members` took in `20260729082308`, and for the same reason: a table-wide
grant plus a policy is an escalation hole waiting for someone to find it.

Contributors deliberately cannot see invites. They can see members — invites are management.

### 2.3 Verify

```sql
select private.generate_invite_code();
```

Run it five times. Expect six uppercase characters, none of them `I`, `O`, `0` or `1`.

---

## Task 3 — Invite RPCs

Migration `20260805090200_invite_rpcs.sql`. All three are `security definer` with
`set search_path = ''`, and all three `revoke execute from anon` then
`grant execute to authenticated`.

### 3.1 `create_household_invite()`

Takes no arguments. One household per User (Task 1.5), so the household is derived from the caller —
an argument would only be a second thing to validate.

Behaviour:

1. Find the caller's membership. None → raise; this cannot happen through the UI.
2. Not an Owner → raise. Use `is_household_owner`.
3. `expires_at := now() + interval '72 hours'`.
4. Insert with `private.generate_invite_code()`.
5. Return the new row.

72 hours matches Life360, which ADR 0016 leans on. It is short enough that a leaked code dies on its
own and long enough to survive a weekend.

### 3.2 `revoke_household_invite(invite_id uuid)`

Sets `revoked_at = now()` where the caller is an Owner of the invite's household and `revoked_at is
null` and `redeemed_at is null`. Returns `jsonb`.

Revoking an already-used invite is a no-op, not an error — the Members screen may be showing stale
data.

### 3.3 `redeem_household_invite(invite_code text)` — the important one

Returns `jsonb`, and **never throws for a condition the user can see**. Same contract as `log_feed`:
the caller reads a status and renders copy for it. An exception here would surface as a raw Postgres
string in a toast, which AGENTS.md forbids.

```
normalise: code := upper(trim(invite_code))

select ... into invite
  from public.household_invites
 where code = <normalised>
   for update;                      -- see below

if not found                     -> { status: 'not_found' }
if invite.revoked_at is not null  -> { status: 'revoked' }
if invite.redeemed_at is not null -> { status: 'already_used' }
if invite.expires_at < now()      -> { status: 'expired' }
if caller already has a membership row:
      same household              -> { status: 'already_member' }
      different household         -> { status: 'already_in_household' }

insert into household_members (household_id, user_id, role)
values (invite.household_id, auth.uid(), 'contributor');

update household_invites
   set redeemed_by = auth.uid(), redeemed_at = now()
 where id = invite.id;

-> { status: 'joined', household_id: ..., household_name: ... }
```

Three things that are not optional:

- **`for update` on the select.** Without it, two people redeeming the same code at the same instant
  both pass the `redeemed_at is null` check and both join. Row-level locking serialises them; the
  second one then reads `already_used`. `log_feed` takes an advisory lock for the same class of
  problem — read `20260726090200_log_feed_lock_and_tiebreak.sql` before writing this.
- **`already_member` and `already_in_household` are different statuses.** "You're already in this
  household" and "You're in another household, leave it first" are different sentences and different
  user problems. Do not collapse them.
- **Normalise the code.** Users type lowercase and paste trailing spaces. Case-insensitivity is in
  ADR 0016 because Life360 users hit this constantly.

### 3.4 Verify

With `execute_sql`, impersonating is not available, so verify what you can structurally:

```sql
select create_household_invite();
select id, code, expires_at, revoked_at, redeemed_at from public.household_invites;
select redeem_household_invite('nosuchcode');   -- expect {"status":"not_found"}
select redeem_household_invite('<the real code>'); -- expect already_member, you are the owner
```

**Revert:** `delete from public.household_invites;` — then confirm the table is empty. The real
redemption path is proven on device in Task 12, not here.

---

## Task 4 — Member management RPCs

Migration `20260805090300_member_management_rpcs.sql`. Both `security definer`, both return `jsonb`.

These cannot be table writes. `20260729082308_household_members_update_preferences.sql` narrowed the
grant to `grant update (feed_logged_alerts)` precisely so a Contributor could not set their own role
to `owner`, and there is no DELETE policy at all. **Do not widen that grant.** Read that migration's
header before starting.

### 4.1 `remove_household_member(member_user_id uuid)`

Guards, in order:

1. Caller must be an Owner of the target's household.
2. **Cannot remove yourself.** Leaving is a different action with different consequences and it is
   not in this ticket. Return `{ status: 'cannot_remove_self' }`.
3. **Cannot remove the Household Creator.** Otherwise a second Owner could evict the person who owns
   the household's billing and its delete right. Return `{ status: 'cannot_remove_creator' }`.

Then delete the membership row and return `{ status: 'removed' }`.

Removal can never leave a household ownerless, because the remover is an Owner and cannot remove
themselves. That is why no departure logic is needed here.

### 4.2 `change_household_member_role(member_user_id uuid, new_role public.household_role)`

Same first guard. Then:

- **Cannot change your own role.** Stops the last Owner demoting themselves into a household nobody
  can manage. `{ status: 'cannot_change_own_role' }`.
- **Cannot change the Creator's role.** `{ status: 'cannot_change_creator' }`.

Then update and return `{ status: 'updated' }`.

Promotion to Owner is only ever this — a deliberate act by an Owner who knows the person. ADR 0017
rejects every automatic path to it.

### 4.3 Verify

```sql
select remove_household_member('<Dylan''s own user id>');       -- cannot_remove_self
select change_household_member_role('<Dylan''s own id>', 'contributor'); -- cannot_change_own_role
```

Both must return their guard status and change nothing. Confirm with a follow-up select on
`household_members`. No revert needed if the guards work; if either one actually wrote, restore the
row and stop.

---

## Task 5 — Service layer

`src/services/household.service.ts`. Follow the existing `namespace` + default export shape.

New domain types — put them where the existing ones live:

```ts
export type HouseholdInvite = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string;
};

export type RedeemResult =
  | { status: 'joined'; householdId: string; householdName: string }
  | { status: 'not_found' | 'revoked' | 'expired' | 'already_used' | 'already_member' | 'already_in_household' };
```

Functions:

- `listInvites(householdId)` — pending only: `revoked_at is null`, `redeemed_at is null`,
  `expires_at > now()`. Order by `created_at desc`. The screen shows outstanding invites, not an
  audit log.
- `createInvite()` — calls the RPC, maps the row.
- `revokeInvite(inviteId)`.
- `redeemInvite(code)` — returns `RedeemResult`. **Maps `household_id` → `householdId` and
  `household_name` → `householdName` here.** The jsonb comes back snake_case; a component must never
  see it.
- `removeMember(userId)`, `changeMemberRole(userId, role)`.

`listMembers` gains `isCreator` on each member, by comparing against `households.created_by`. The
Members screen needs it to hide actions that would fail.

**Throw `UserFacingError` (`@/lib/errors`) for the redeem statuses that have real copy.** That is what
`userFacingMessage(error, fallback)` is for, and it is why AGENTS.md says the service owns the
sentence when the sentence is for a person. `not_found` → "That code doesn't match an invite."
`expired` → "That invite has expired. Ask for a new one." `already_in_household` → "You're already in
a household. Leave it before joining another."

---

## Task 6 — Query hooks

- `use-household-invites.ts` — `useQuery`, key `['household-invites', householdId]`.
- `use-invite-mutations.ts` — `useCreateInvite`, `useRevokeInvite`, `useRedeemInvite`.
- `use-member-mutations.ts` — `useRemoveMember`, `useChangeMemberRole`.

Rules, all from AGENTS.md:

- Toasts live in the hook's own `onSuccess` / `onError`. Callbacks passed to `mutate()` are dropped
  when a component unmounts first — and redeeming navigates immediately, so this is not theoretical.
- Every `onError` also `console.error(error)`.
- Invalidate `['household-members', householdId]` and `['household-invites', householdId]` from
  `onSettled`.
- `useRedeemInvite` must also invalidate `['has-household', userId]` — that is the query
  `src/app/(protected)/_layout.tsx` guards on. Miss it and the user joins successfully and stays
  stuck on the onboarding fork.

---

## Task 7 — Messages

`src/constants/enums.ts`, alphabetical within each enum, named subject-then-outcome.

`SuccessMessage`: `InviteCreated`, `InviteRevoked`, `MemberRemoved`, `MemberRoleUpdated`,
`HouseholdJoined` (needs the household name at runtime, so it is the documented exception — build it
at the call site from a template).

`ErrorMessage`: `InviteCreateFailed`, `InviteRevokeFailed`, `InviteRedeemFailed`,
`MemberRemoveFailed`, `MemberRoleUpdateFailed`.

Copy is British English, sentence case, and says what a person can do about it.

---

## Task 8 — The onboarding fork

**Invoke `/frontend-design` and `/expo-native-ui` first.**

Today `(onboarding)/_layout.tsx` registers `pet-details` then `feeding-schedule`, and a user with no
household lands on pet-details. That is now the *second* thing they might want.

- **Create `(onboarding)/index.tsx`** — the fork. Two choices: **Create a household** (→
  `/pet-details`) and **Join a household** (→ `/join`). Make Create the visually primary one; most
  users are creating.
- **Create `(onboarding)/join.tsx`** — one code field and a submit. Six characters, `autoCapitalize`
  set so people are not fighting the keyboard, `autoCorrect` off. Use `TextInputValidated` with a
  `name` so it can render its own error — AGENTS.md notes an input without `name` silently cannot.
- **Modify `(onboarding)/_layout.tsx`** — register `index` first so it is the initial route.

On success: invalidate, toast the household name, and let the guard in
`src/app/(protected)/_layout.tsx` do the navigation. Do not push a route manually; `hasHousehold`
flipping is what moves them.

A joining Contributor **must not** be sent through pet-details. They are joining a household that
already has a pet. This is the whole point of the fork.

---

## Task 9 — The Members screen

**Invoke `/frontend-design` and `/expo-native-ui` first.**

Route `src/app/(protected)/(tabs)/profile/household.tsx`, reached from a `Household` row on Profile
above `Notifications`. Copy the existing row markup in `profile/index.tsx` exactly — same
`PressableOpacity`, same icon-label-caret shape.

Contents:

1. **Members.** Name, role, and "Creator" where `isCreator`. An Owner sees actions; a Contributor
   sees a read-only list.
2. **Pending invites.** A *different* row shape — there is no person yet. Show the code, when it
   expires, and a revoke action. Do not try to make it look like a member row.
3. **Invite someone.** Generates a code and presents `invite-sheet.tsx`.

`invite-sheet.tsx` builds on `BaseSheet` — the only value import of `TrueSheet` in this codebase is
inside `base-sheet.tsx`; import it as a **type** here. `detents: ['auto']`, since this is
content-sized. Read `backgroundColor` from `useTheme()` inside the component; capturing colours at
module scope silently breaks dark mode on a natively-drawn sheet.

The sheet shows the code large and legible, and shares **plain text** via the system share sheet:
household name, the code, and the App Store link. **No URL, no deep link** — ADR 0016. The App Store
link does not exist yet; put it behind one constant with a `TODO` naming CRU-008 so there is exactly
one place to fill in.

Destructive actions (remove a member, revoke an invite) confirm first.

Guard the UI on role: a Contributor must not see remove, promote or invite. The RPCs enforce it
anyway, but a control that always fails is worse than no control.

---

## Task 10 — Enable the popover row

`src/components/ui/create-actions.ts` — remove `isDisabled: true` from `Invite someone` and point it
at `/profile/household`.

Leave the other two rows disabled. Their comment explains why and it still holds.

**Present after the popover has closed, not alongside** — AGENTS.md flags that a native sheet raised
while the overlay is still up gets swallowed by iOS. Here you are navigating rather than presenting,
which is safer, but the ordering rule still applies.

---

## Task 11 — Tests and gates

`tests/services/household.service.test.ts`, mocking `@/lib/supabase/client`:

- `redeemInvite` maps `household_name` → `householdName`. This is exactly the class of leak AGENTS.md
  says was found in the wild once already.
- `listInvites` filters out revoked, redeemed and expired.
- `listMembers` sets `isCreator` correctly.

Then:

```bash
bun run check
```

Typecheck, lint, spellcheck, test — stopping at the first failure. Spellcheck needs Node ≥ 22.18; if
the shell resolves Node 20, run it as `PATH="$HOME/.volta/bin:$PATH" bun run check`.

Lint must not gain a warning. Count the pre-existing ones before you start so you can tell.

**What these tests cannot tell you:** none of the SQL. The guards, the `for update` serialisation and
every RLS policy are invisible to Jest. Do not report them as verified because the suite is green.

---

## Task 12 — The device test

This is the acceptance criterion, and it is the reason the ticket exists.

1. Dylan's device: Profile → Household → Invite someone. Copy the code.
2. Second physical device, second person: install, sign up, verify the email OTP.
3. Onboarding shows the fork. Tap **Join a household**, type the code.
4. Lands in the existing household, on Home, seeing the existing pet.
5. Dylan's device: Members screen now lists two people.

Then the thing that has never once been observed working:

6. The second person logs a feed. **Dylan's device receives a Feed Logged Alert.**

`recipients.ts` excludes the actor, so a one-member household has always resolved to zero recipients —
which is why this push has shipped untested since PAW-003. This step is the first real proof.

Use Argent for the driving device. Report what actually happened, including step 6 if it fails.

---

## Out of scope — do not build these

- **Leaving a household, and deleting an account.** ADR 0017 decides the behaviour; this ticket does
  not implement it. `on delete restrict` on `created_by` is the deliberate stand-in and Task 1.1 says
  why.
- **Anything to do with billing.** ADR 0018 is recorded so it is not re-derived. No RevenueCat, no
  entitlement checks, no member cap.
- **Multiple households per User.** Task 1.5 forbids it on purpose.
- **A universal link, `associatedDomains`, or any deep link.** ADR 0016.
- **A role picker on the invite.** Invitees join as Contributor. Promotion is a separate, deliberate
  act on the Members screen.
- **A Viewer role.** Considered and not wanted; additive later if it turns out to be real.
- **Enabling the other two popover rows.**

## Do not

- Do not widen the `update` grant on `household_members`.
- Do not add `returning` to the households insert in `create_household_and_pet()`.
- Do not let `redeem_household_invite` throw for a status the user should read.
- Do not import `supabase` outside `src/services/`.
- Do not import `toast` from `sonner-native` outside `@/lib/toast`.
- Do not import a Lucide icon outside `src/constants/icon-map.ts`.
- Do not claim any of this works on a device until Task 12 has actually been run. Two features in
  this repo already shipped "verified" against mocks and were dead on device.
