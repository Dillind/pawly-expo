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
