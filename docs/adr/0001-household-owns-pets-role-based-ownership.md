---
status: accepted
---

# Household owns pets; ownership is a role, not a pet column

A **Household** is the group of people who care for one or more pets. Pets belong to a household (`pet.household_id`), and a person's relationship to the household is expressed through a **Household Member** record carrying a `role` (`owner` | `contributor`). We deliberately did **not** model a household as belonging to a single pet, and we do **not** store `owner_id` on the pet.

## Considered options

- **Household per pet** (`households.pet_id`, plus `pets.owner_id`) — the shape originally sketched in the tech stack. Rejected: it forces a second household (and re-inviting the same people) the moment multiple pets are added in v2, and it creates two disagreeing sources of truth for "who owns this" (`pets.owner_id` vs a member `role`).
- **Household owns many pets; ownership is a member role** (chosen). v1 exposes a single pet in the UI, but the schema already supports many with no migration. Ownership lives in exactly one place: `household_member.role = owner`.

## Consequences

- v2 "multiple dogs" is additive (insert more `pet` rows under the same household) rather than a live-data migration.
- **Multiple owners are allowed.** `owner` is the highest role: an owner can edit/delete anything in the household and manage members. A `contributor` can log feeds and edit/delete only their own recent feed logs.
- All row-level security keys off household membership, not pet ownership.
