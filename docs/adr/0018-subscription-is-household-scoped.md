---
status: accepted
---

# A subscription is household-scoped, and the entitlement lives on the User

One member pays, and everyone in their household gets Pro. The RevenueCat entitlement stays attached
to the **User** who bought it; a household is Pro when **any current member** holds a live
entitlement. That is a derived read, not a flag stored on the household.

Nothing here ships in v1 — PRODUCT_BRIEF is explicit that there is no paywall yet. It is recorded now
because the invite and membership work had to not foreclose it, and because the central finding is a
platform constraint that would otherwise be re-litigated every time someone suggests seats.

## Considered options

- **Per-seat pricing — pay more per member** — not rejected on taste. It is **not possible**. An
  Apple auto-renewable subscription carries no quantity, and RevenueCat is a thin layer over StoreKit
  and Google Play Billing, so seats cannot be added to or removed from a subscription once it has
  started. The documented workaround is separate tiered products ("Pro, 2 members", "Pro, 5 members")
  moved between inside one subscription group — which means that on downgrade the app must pick
  existing members of a household and lock them out. There is no acceptable screen for that. Per-seat
  billing is a Stripe idea, and Stripe is not available for digital goods inside an iOS app.
- **Store the entitlement on the household** — rejected. A subscription belongs to an Apple ID and
  cannot be cancelled, transferred or refunded by the app. Modelling Pro as household property
  creates a handover problem with no mechanism behind it: what happens to the household's Pro when the
  payer leaves has no answer, because the thing being handed over was never the household's.
- **Entitlement on the User, household Pro derived from current membership** (chosen). Every hard
  case then answers itself, below.

## Consequences

- **The payer leaves and the household drops to free immediately.** Their membership row goes, no
  current member holds an entitlement, done. No cancellation, no proration, no transfer step.
- **Their money follows them.** The subscription keeps renewing on their Apple ID and makes whatever
  household they are in next Pro — the one they create when they get their own pet. They paid, they
  keep the benefit. This is the only behaviour Apple's model permits anyway.
- **A new Owner does not inherit anything; they just subscribe**, from the paywall, normally.
- **Hide the paywall when the household is already Pro**, so a second member cannot double-charge
  themselves for something they already have.
- **Wiring is a RevenueCat webhook into a Supabase Edge Function** that refreshes the entitlement on
  the user row. Household Pro is then a join against current membership.
- **A free rider is not lost revenue.** The unpaid Owner is someone using the app daily who will need
  their own household the day they get their own pet. A multi-member household also retains far
  better than a solo one, which is what the PRODUCT_BRIEF success metric actually measures.
- **If household size should ever affect price, the honest lever is a member cap on the free tier** —
  free households get N members, Pro removes the cap. It prices what actually costs money (push
  volume, `alerts` rows), it is checked only when someone joins, and it can never strand an existing
  member. `redeem_household_invite` is already counting membership rows, so the check is nearly free
  to add.
- **Belonging to more than one household is itself a paywall candidate.** See
  [ADR 0017](./0017-household-lifecycle-creator-and-departure.md).
