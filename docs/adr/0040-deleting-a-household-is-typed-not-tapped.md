# 0040 — Deleting a Household is typed, not tapped

Date: 2026-09-15
Status: Accepted
Ticket: CRU-148

## Context

There was no way to delete a Household. The only exit was **Leave household**, which drops your own
membership and leaves the Household standing — so a sole Owner who left orphaned it, and a Household
made by mistake could not be removed at all.

Nothing supported a delete at any layer: no UI, no service function, no RPC, and no DELETE policy on
`public.households`. A row could only be removed with the service role.

Deleting a Household is not the same size of decision as removing a Pet. Removing a Pet destroys
your own data. Deleting a Household destroys every member's feed history, Pets, Posts and Care
Cards, and they get no say.

## Decision

**The confirmation is the Household's name, typed by hand**, as GitHub does for a repository. Not an
alert with a Delete button.

An alert is the repo's standard for a decision that has to be made now, and it is the right control
for removing a Pet. It is the wrong one here. An alert is two taps in the same place the last two
taps were, and a person who has decided to tap through does not read it. Typing the name cannot be
done by muscle memory: it requires reading the name, and the name is the thing being destroyed.

The gate lives in three places, deliberately:

- The Zod schema on the Danger zone screen, so the red button is dead until the name matches.
- `delete_household`, which repeats the comparison, because the screen is not the only possible
  caller and the RPC is what actually performs the delete.
- The comparison is **trimmed but not case-folded**. Whitespace is what a keyboard adds on its own;
  case is what reading carefully produces.

**No alert on top of it.** A second confirmation after the typed one teaches the Owner that
confirmations are noise, which is the habit this whole screen exists to avoid.

**The Owner can delete whatever the other members think**, again as GitHub does. The warning names
the counts — how many Pets, members and followers go with it — but nobody is asked. The alternative,
blocking until every other member has left, traps an Owner whose co-owner stopped using the app.

**It is a hard delete with no grace period.** Every dependent table already cascades from
`households`, so the row delete is the whole of the row cleanup.

## Consequences

The Owner's own client heals at once: the mutation refetches the household list, then clears the
active Household id, and `useHousehold` falls back to the next one — or to nothing, which is the
Home empty state.

**Every other member's client keeps the deleted Household for up to five minutes.** The query cache
is persisted to AsyncStorage and `useHouseholds` has a five-minute `staleTime`, so their list is
served from disk without a refetch. They see a Household that no longer exists until that window
closes, and opening it reads as "You are no longer in this household", which is already handled.
This is accepted rather than fixed: the alternative is a realtime channel for an event that happens
once in the life of a Household.

**The photos go through the Storage API, not the cascade.** Postgres refuses a
`delete from storage.objects` outright, so `HouseholdService.remove` reads a manifest, clears both
buckets, and only then calls the RPC — in that order, because the policies that authorise the Owner
read the rows the cascade is about to take away. Two new policies key off those rows rather than off
the object's path, which is what lets an Owner remove a photo another member uploaded.
`KNOWLEDGE.md` has the detail.

## Two objections, and why they stand as they are

**The photos are deleted before the Household, and there is no rollback.** True. If the final RPC
failed after the buckets were cleared, the Household would stand with its images gone. The order is
not a preference: every policy that authorises the Owner to delete a photo reads the rows the
cascade is about to remove, so after the delete there is nothing left to prove the objects were
ever theirs. The window is narrowed instead — the manifest RPC applies the same Owner and
typed-name checks as the delete, and the delete re-reads ownership behind a row lock, so by the
time a file is touched the only remaining failure is the network.

**The new policies let an Owner delete a Household's photos without deleting the Household.** Also
true, and it grants nothing the role did not already have. An Owner may delete any Pet or any Post
in their Household, and both take the same objects with them. The policies close a gap where the
Owner could destroy the row but not the file it pointed at.

## Alternatives considered

- **An alert, like removing a Pet.** Rejected above. Consistency with the Pet screen is worth less
  than not destroying a household by reflex.
- **A DELETE policy on `households` instead of an RPC.** A policy can say who may delete. It cannot
  require that the Owner typed the name, so the whole guard would live on the client.
- **A soft delete with a restore window.** Every query in the app would have to learn to exclude
  deleted Households, and a Handle would stay reserved by something nobody can see. The cost lands
  on every read to buy back a decision that is deliberately hard to reach.
