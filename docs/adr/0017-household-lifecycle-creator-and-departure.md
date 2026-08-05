---
status: accepted
---

# The Household Creator is a column, and a Household dies with its last Owner

Three related rules about who controls a Household and what happens when they leave.

**The Creator is recorded, not ranked.** `households.created_by` stores the User who created the
household. It is not a role: `household_role` stays `('owner', 'contributor')`. Two actions check
`created_by = auth.uid()` — deleting the household, and managing billing. Everything else an Owner can
do, the Creator can do, and vice versa.

**A User belongs to exactly one Household.** Enforced with `unique (user_id)` on `household_members`.

**A Household ends when its last Owner leaves.** If other Owners remain, `created_by` moves to the
longest-standing of them, silently. If no Owner remains — only Contributors, or nobody — the household
is deleted. A Contributor is never promoted automatically.

## Considered options

### For the Creator

- **A third enum value above `owner`** — rejected. Two exclusive actions do not justify it. Every RLS
  policy and every `is_household_owner()` call would have to be re-read to decide whether it means
  "owner" or "owner or above", which is a wide blast radius for a narrow gain. A role is also the
  wrong shape: `created_by` is a fact, and if an ordinary Owner is later allowed to delete the
  household, a fact just stops being consulted whereas an enum value has to be migrated out.
- **Derive the Creator from the oldest `household_members` row** — rejected. It is a guess, and a
  wrong one the moment that person leaves. `create_household_and_pet()` is the only thing that ever
  creates a household and it is the only place that knows the answer, so the column is written there
  or not at all.
- **`households.created_by`** (chosen), with an `is_household_creator()` helper beside the two
  existing helpers in `20260722120000_auth_foundation.sql`.

### For departure

- **Delete the household whenever the Creator leaves** — rejected. Another Owner's feed logs, photos
  and Care Card edits are their own records of their own actions, and destroying them from a button
  labelled "Delete account" is invisible to the person pressing it. It also hollows out
  [ADR 0001](./0001-household-owns-pets-role-based-ownership.md): if a household dies with one
  specific human, "multiple owners are allowed" is decoration.
- **Promote the longest-standing Contributor when no Owner remains** — rejected, and this is the more
  interesting rejection. A Contributor who was invited once and forgotten would silently inherit
  control of a household. Note what promotion does and does not grant: a Contributor can already
  *see* everything — pet, Care Card, Activity, photos — because membership grants that, and that is
  fine, they were invited. Promotion grants **control**: delete, manage members, invite. Handing that
  to someone by rule, because everyone else happened to leave, is the wrong default.
- **Ask the departing Owner to choose — promote someone, or delete** — rejected as unnecessary once
  auto-promotion was ruled out. It adds a decision screen to the account-deletion flow to reach an
  outcome the simpler rule already reaches.
- **Household ends with its last Owner** (chosen). Two cases, only one of which is a transfer, and
  neither asks a question.

### For one household per User

- **Allow many** — deferred, not rejected. The professional pet sitter working for three households
  is exactly who the Contributor role exists for, so the demand is real. But it needs an
  active-household switcher and every query re-keyed on it, which is its own ticket.
- **`unique (user_id)`** (chosen for now). One line, and it converts a latent bug into a clear
  message.

## Consequences

- **`created_by` must land before any invite work.** Backfilling it later means guessing.
- **`household_members` is where the constraint lives**, so a second membership row fails at the
  database rather than in application logic. `redeem_household_invite` checks first and returns
  `already_in_household` so the user sees copy rather than a constraint violation.
- **This fixes an existing silent bug.** `HouseholdService.getForUser` uses `.limit(1)` with no
  `order by` (`src/services/household.service.ts`), so a user with two membership rows would get an
  arbitrary household, potentially a different one per call. `existsForUser` has the same shape. The
  unique constraint makes the assumption in that file's comment true rather than hopeful.
- **Multi-household is a paywall candidate**, not just deferred work — it is breadth, which is where
  PRODUCT_BRIEF puts the Pro line. It also introduces a second kind of buyer: an Owner pays for pets
  and history, a sitter pays to sit for several households.
- **Promotion still exists**, on the Members screen, as a deliberate act by an Owner who knows the
  person. It is only ever manual.
- **Removing a member and changing a role need `security definer` RPCs.**
  `20260729082308_household_members_update_preferences.sql` deliberately narrowed the grant to
  `grant update (feed_logged_alerts)` so a Contributor could not set their own role to `owner`, and
  there is no DELETE policy at all. That grant must not be widened.
- **Account deletion has to say what it does.** Deleting a Crumpet account does not cancel an Apple
  subscription — Apple keeps billing until the user cancels in Settings. App Store Review Guideline
  5.1.1(v) requires in-app deletion to remain available and immediate.
- **The departure half of this ADR is decided but not yet built.** CRU-008 ships `created_by`, the
  unique constraint, invites and member management. Leaving a household and deleting an account are a
  later ticket. Until then `households.created_by` uses `on delete restrict`, so an attempt to delete
  a User who created a household fails loudly at the database instead of silently taking the
  household with it. That restriction is the thing the later ticket replaces.
- **The last Owner leaving destroys a household that other Contributors are actively using.** This is
  accepted, not overlooked: the pet is the Owner's, and a helper does not keep the pet when the owner
  leaves. The confirmation names how many members are affected and what is lost. It is never silent.
