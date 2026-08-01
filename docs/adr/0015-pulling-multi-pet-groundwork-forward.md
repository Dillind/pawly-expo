---
status: accepted
---

# Pull multi-pet groundwork forward, without building multi-pet

PRODUCT_BRIEF puts multiple pets in v2, as a paywall candidate. This ticket does not build multi-pet.
But it stops treating "one pet per household" as permanent, in two places: the pet detail screen
(`src/app/(protected)/(tabs)/home/pet/[petId].tsx`) is laid out so a pet selector can be added at its
top later, and navigation never routes through a pet list screen — every destination already takes a
`petId`.

## Considered options

- **Build for one pet only, revisit navigation when multi-pet ships** — rejected. The v1 UI already
  has a natural seam where a selector belongs, at the top of pet detail. Not designing around it now
  means every screen that currently reads "the pet" implicitly would need a second look later, not
  just an addition.
- **Add a pet list screen now, even with one pet in it** — rejected. A list screen with one entry is
  a wasted tap and it commits to a destination shape (a list, versus a switcher, versus tabs) before
  there's a second pet to design it against.
- **Route every screen by `petId`, add the selector later without moving destinations** (chosen).
  `pet/[petId].tsx` already takes a route param rather than assuming a single pet. Upgrading to
  multi-pet means adding a selector at the top of that screen — no screen's URL or position in the
  navigation stack changes when a household goes from one pet to several.

## Consequences

- **`usePet()` (`src/hooks/use-pet.ts`) still means "the oldest pet".** It orders by `created_at`
  ascending and takes the first row — the one onboarding created. Four call sites depend on that
  meaning: `src/app/(protected)/(tabs)/home/index.tsx`,
  `src/app/(protected)/(tabs)/activity/index.tsx`, `src/components/bottom-sheets/log-feed-sheet.tsx`,
  and `src/components/screens/profile/notification-settings.tsx`.
- **Multi-pet has to change all four call sites together.** None of them can move to "the selected
  pet" independently — a household with a selector but a Home screen still hard-wired to the oldest
  pet would show one pet's care and let you feed another. Whoever builds the selector should treat
  this list as the checklist, not just the starting point.
- `usePetDetail` (`src/hooks/use-pet-detail.ts`), not `usePet`, is what pet detail itself uses — it
  already takes a `petId`, so it needs no change when the selector arrives.
