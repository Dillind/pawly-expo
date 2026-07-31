# CRU-006 — Pet profile, Care Card, and the Tray

Design spec. Written 2026-08-01.

## What this is

Three things that turn out to be one piece of work:

1. **Home becomes a dashboard** — today's feed status stays the hero, with a tile grid beneath it.
2. **A pet gets a real profile** — bio, cover photo, gallery, Care Card, and an editable feeding schedule.
3. **A `Tray` component** — a sequenced, height-varying bottom sheet. Every edit in (2) happens in one.

The Tray is the deliverable. The pet profile is what it is demonstrated on.

## Why now

Two holes make this urgent rather than cosmetic.

**A feeding schedule cannot be changed.** `feeding_schedules` is written once by
`create_household_and_pet` during onboarding and never touched again. No hook, no screen, no RPC.
Move a dog's dinner from 5pm to 6pm and the missed-feed sweep nudges the household every night
forever, and the only escape is turning alerts off — a toggle that also does not exist.
PRODUCT_BRIEF names the two things that make people delete this app: "notifications that are too
noisy, or a log that feels untrustworthy". An unchangeable schedule manufactures the first.

**There is nowhere to edit a pet.** Whatever was typed during onboarding is permanent, including the
photo.

## Decisions

Each of these was a real fork. They are recorded so the reasoning is not re-derived.

### Home keeps its hero

Today's feed status stays at the top of Home. Tiles go beneath it.

The alternative was a pure tile grid, with feed status moved to a tile or to Activity. Rejected,
because **a Missed Feed cannot be rendered anywhere else.** A Missed Feed is the *absence* of a
Feed Log. Activity renders logs — things that happened — and an absence has nothing to draw. Only
`private.slot_states` can produce it, by deriving Slot state from the Feeding Schedule. Move feed
status off Home and the entire missed-feed engine has no in-app surface: the push notification
becomes the only way a household ever learns a feed was missed, and tapping it lands on a screen
that cannot show what it was about.

Home also gains the day and date at the top.

### One tile, not four

Only a **Pets** tile ships. The mockup had four; the other three are deferred, each for a reason
that is about timing rather than merit:

- **Recent Activity — cut, not deferred.** Activity is already a tab, one tap away. A second door
  to the same room.
- **Household ("who is in your household") — deferred.** Invites do not exist and were parked on
  2026-08-01, so the members list would show one member indefinitely.
- **Analytics — deferred.** No data. PRODUCT_BRIEF's own words about the calendar view apply
  equally: "needs weeks of data to be useful."

Run as a real new user, three of the four tiles are empty, hollow, or redundant. Tiles should
arrive as the features behind them become real.

### The tile grid is data, not JSX

Tiles are a list of descriptors rendered by a generic container. A rearrangeable widget-style
dashboard is a wanted future feature; building the grid this way now means ordering becomes data
later instead of a rewrite. It costs nothing today.

### View and edit only — no adding pets

`usePet()` means "the household's oldest pet" (`limit(1)`, ordered by `created_at`) and has four
call sites: Home, Activity, the log sheet, and notification settings. All four silently pick the
first pet.

Adding a second pet without an active-pet concept produces a pet that `sweep_missed_feeds` alerts
about — it loops over every pet in the household — but which has no surface anywhere in the app.
Multi-pet needs a selector across four screens plus the paywall, and that is its own ticket.

**No delete-pet either.** `usePet()` uses `.single()`, which errors on zero rows. Deleting your only
pet breaks Home, Activity and the log sheet, and with no add-pet you could not recover. Delete lands
with multi-pet.

### Navigation: tile straight to the pet

The Pets tile opens the pet detail screen. **There is no list screen.**

A list earns its place at five or six items. A household has one to three pets, and the free tier
caps at one — so a list would be a single row that every free user taps through forever. When
multi-pet lands, a selector goes at the top of the detail screen (segmented control or pager). This
also means no navigation destination changes the day someone upgrades.

The cost: no place to bulk-manage. Reordering and deleting live inside the detail screen rather than
as swipe actions on a row. At three pets that is fine.

### Media: bio, cover photo, gallery. No video.

Video is cut, and not merely deferred. The `pet-photos` bucket is **public**, so a video would be
readable by URL by anyone who has it. There is no transcoding, a 4K iPhone video is roughly 400MB,
and Supabase bills egress. That is a hosting and cost decision, not a feature toggle. A photo
gallery delivers most of "really put in all the details of your pets" at a fraction of the cost.

If video returns, it returns with a hosting decision attached.

### The Care Card is a handover, not a medical record

Now in CONTEXT.md. Research into what pet owners are told to record splits into two clusters that
look similar and are not:

- **The medical record** — vaccination dates and booster intervals, surgeries, hospitalisations,
  chronic conditions, test results. Every source frames this as something you *request from your
  vet*, because the vet already holds it. Building it means a worse copy of an existing system.
- **The handover** — what someone else needs to look after this animal today. Sitter checklists
  converge on: allergies, medications with dose and how to administer, vet and emergency vet
  contacts, microchip and insurance numbers, feeding amounts, which treats are allowed.

The second is Crumpet's product. It is the same information that currently lives in the WhatsApp
message PRODUCT_BRIEF says the app replaces, and no vet portal serves it because the vet is not the
audience — the dog walker is. `Contributor` is already defined as that person, and `recipients.ts`
already carries a comment saying "the midday dog walker is precisely the person who most needs to
know". The app has designed for them and given them nothing to read.

**Named `Care Card`, never "health section".** That name promises clinical history the Care Card
deliberately does not hold, so users would look for vaccination dates and find none.

Deferred, each for a specific reason:

- **Vaccinations** — dates plus reminders is a different interaction model. PRODUCT_BRIEF already
  parks vet reminders in v2 for that reason.
- **Weight** — a time series wanting a chart, and a named paywall candidate.
- **Walks, water, medication reminders** — logging loops like feeding, not profile content.

### New schedule slots apply from tomorrow

Add a 7am morning feed at 3pm today and the naive rule marks it **Missed** — accusing the household
of missing a feed that was not on the schedule when it happened. That is precisely the "log that
feels untrustworthy" failure PRODUCT_BRIEF calls fatal.

`slot_states` gates on `feeding_schedules.created_at` against the local date. No schema change.

Three related cases resolve themselves and need no work:

- **Changing a slot's time is safe.** `alerts_idempotency_idx` on `(kind, subject_id, subject_date)`
  means moving a time cannot produce a second nudge for the same slot on the same day.
- **Deleting a slot is safe.** `alerts.subject_id` has no foreign key — it is deliberately
  polymorphic. `subjects.ts` already does `maybeSingle()` → null → stamps `error = 'subject not
  found'`. Those rows also stop counting toward the Nudge Limit, because of the `error is null`
  filter.
- **The database is already ready.** `feeding_schedules` has full RLS: Owners insert, update and
  delete; Members select. Schedule editing needs hooks and UI, not a migration.

### The Tray

Modelled on Family's dynamic tray system. The rules that matter:

- Trays reveal complexity progressively — one concept per tray, never two.
- **Each successive tray varies in height.** This is deliberate, not decoration: differing heights
  make a sequence read as progression rather than a swap.
- Title plus icon; the icon dismisses on the first tray and goes back on later ones.
- Theming follows context.
- The point is that a complex action feels manageable and stays anchored to where it started,
  rather than becoming a full-screen commitment.

**Implementation constraint.** AGENTS.md warns that stacking a modal on a native sheet is a rough
edge on iOS, so a tray *chain* cannot be nested sheets. It must be **one sheet whose content swaps
while its height animates** — `TrueSheet.resize()` between detents. That is what makes the
varying-height rule work rather than just look nice.

Built on `BaseSheet`, per ADR 0010 and the AGENTS.md rule that `TrueSheet` is only ever value-imported
inside `base-sheet.tsx`.

## Data model

Five migrations.

**1. `pets.bio`** — one nullable `text` column.

**2. `care_cards`** — 1:1 with a pet, keyed on `pet_id`. Keeps `pets` about identity rather than
growing ten columns.

```
pet_id (pk, fk pets on delete cascade)
allergies text
vet_name text
vet_phone text
emergency_vet_name text
emergency_vet_phone text
microchip_number text
insurance_provider text
insurance_policy_number text
feeding_notes text
notes text
updated_at timestamptz
```

**3. `care_card_medications`** — medications repeat, so they are rows, not a column.

```
id (pk)
pet_id (fk pets on delete cascade)
name text not null
dose text
schedule_text text        -- "twice daily, with food"
instructions text         -- how to administer
sort_order integer
```

**4. `pet_photos`** — the gallery.

```
id (pk)
pet_id (fk pets on delete cascade)
storage_path text not null
sort_order integer
created_at timestamptz
```

Two different caps, which is easy to misread. **10 is the hard ceiling** — nobody ever exceeds it,
and it is enforced by a `before insert` trigger counting existing rows, because a client-side check
is advice where a trigger is a rule. **3 is the free-tier cap**, a product rule enforced in the app
once RevenueCat exists. No paywall ships in v1, so in practice every user gets 10 today.

`pets.photo_url` stays as the cover and is unchanged — the gallery is additional, not a replacement.

**RLS on all three new tables** follows the existing pattern: Members select, Owners write, joined
through `pets` via `private.is_pet_household_member` / `private.is_pet_household_owner`, which
already exist.

**5. Partial unique index on `feeding_schedules (pet_id, label) where label <> 'custom'`.** Two
"dinner" slots are currently legal and produce two identical notifications — "No one has logged
Bailey's dinner feed", twice, indistinguishably. Custom slots may repeat.

## Screens and components

**Home** (`(tabs)/home/index.tsx`)
- Day and date header
- Feed status hero — unchanged
- `TileGrid`, descriptor-driven, one `Tile`: Pets

**Pet detail** (`(tabs)/home/pet/[petId].tsx`, inside the existing Home stack)
- Cover photo, name, breed, age from birthdate
- Bio
- Gallery strip
- Care Card sections
- Feeding schedule, with edit

**New components**
- `Tray` — core primitive, on `BaseSheet`
- `TileGrid` / `Tile`
- `GalleryStrip`, `CareCardSection`, `ScheduleSection`

**New hooks** — `usePetDetail`, `useUpdatePet`, `useCareCard`, `useUpsertCareCard`, `usePetPhotos`,
`useAddPetPhoto`, `useDeletePetPhoto`, `useFeedingSchedules`, `useUpsertSlot`, `useDeleteSlot`.

All edits go through a Tray. All time inputs use `DateTimePickerValidated` with `mode="time"`, per
AGENTS.md.

## Motion

- Tiles enter with a stagger **once per app launch**, not per focus. Home is hit several times a day
  to answer one question fast; a 400ms performance on every tab switch turns charm into friction.
- **The feed-status hero never animates.** It is the answer. It should be painted, not performed.
- `AccessibilityInfo.isReduceMotionEnabled()` is respected — motion sickness is real and iOS review
  checks.
- `react-native-reanimated` 4.5.0 is installed; layout animations handle the stagger declaratively.

**Open, needs a decision before implementation:** `createShadowSmall` uses `shadowRadius: 0` with a
3pt offset — a hard-edged, neo-brutalist shadow. Most "clean dashboard" designs use soft diffuse
elevation (radius 8–16, lower opacity). These are different visual languages and mixing them reads
as accidental. Pick one for the tiles.

## Free vs Pro

Per the Hevy model already in PRODUCT_BRIEF: never cap the core loop, cap breadth and history depth,
and never destroy data on downgrade.

| | Free | Pro |
| --- | --- | --- |
| Logging feeds | Unlimited, forever | core loop — never capped |
| Pets | 1 | Multiple |
| Activity history | 30 days | All-time |
| **Care Card** | **Everything** | — |
| Gallery photos | 3 | 10 |

The Care Card is entirely free, deliberately. Allergies, medications and an emergency vet number are
safety information. A dog walker hitting a paywall to learn the dog is allergic to chicken is the
kind of thing that ends up in a screenshot on social media. The paywall goes on gallery breadth —
decorative — not on anything that makes the app worse at its job.

No paywall ships in v1. This defines the seam, not the gate.

## Verification

There is no test runner in this project, so verification is manual and against the live database,
the same as CRU-005. The gates are `bun run typecheck`, `bun run lint`, and cspell via the Node 24
path.

Cases that need explicit checking, because they are the ones that bite:

1. A slot added today shows nothing today and appears tomorrow.
2. Changing a slot's time after a missed-feed alert has fired produces no second alert that day.
3. Deleting a slot leaves its alert rows stamped `subject not found` and does not break Activity.
4. The 11th gallery photo is rejected by the trigger, not just by the UI.
5. A second `dinner` slot is rejected by the partial unique index.
6. Tray sequences animate height between steps and the icon goes back, not closed, past step one.
7. Tile stagger plays on cold start and not on tab switch.

## Deferred

Recorded so they are not lost, and explicitly not in this ticket:

- **Time-of-day theming on Home** — a morning/lunch/night treatment indicating time of day.
- **Rearrangeable dashboard** — widget-style add, remove, reorder. The descriptor-driven grid is the
  groundwork.
- **Sharing a Care Card outside the app**, as a PDF or a link a sitter opens without installing
  Crumpet. This wants the same web hosting as the public household profile idea and as universal
  links for invites — three features, one hosting decision, best made once.
- **Profile settings list**, modelled on Family's "Your Family" screen, including the `›` versus `⋮`
  distinction — chevron navigates, kebab opens a menu in place.
- **Permission priming.** Family's Enable Permissions screen is better than what ships today, and
  missed-feed alerts make it matter more — a user who blind-denies gets an app whose main feature
  silently does nothing. But `src/lib/notification-permission.ts` states the current behaviour is
  deliberate: "Raises the OS permission dialog directly, with no in-app pitch in front of it."
  Changing it reverses a recorded decision and wants an ADR.
- **Mascot and illustration pass.** PRODUCT_BRIEF asks for "animated empty states + mascot moments"
  and Crumpet is a real dog.
- **Multiple pets**, the active-pet selector, and delete-pet.
- **Missed Feed Alerts toggle** — the preference exists in the database and `recipients.ts` honours
  it, but `notification-settings.tsx` renders only the Feed Logged toggle. Separate small ticket.

## ADRs to write with the implementation

- **Pulling multi-pet groundwork forward.** PRODUCT_BRIEF puts multiple pets in v2 as a paywall
  candidate. This ticket does not build multi-pet, but it reverses the assumption that one pet is
  permanent, and the reversal should be recorded.
- **The Tray as the standard presentation for sequenced edits.** ADR 0010 chose TrueSheet over
  expo-router form sheets. This extends it: sequences are one sheet with swapping content and
  animated height, never nested sheets, because iOS handles stacked presentations badly.
