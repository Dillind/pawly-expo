# Crumpet — golden visual system

The brief for Claude Design. Everything below is settled. Do not reopen it without a reason.

Crumpet is a pet-care coordination app for iOS. A household shares one pet. Members log feeds,
everyone is notified, and the app flags a feed nobody logged. It is built in Expo and React Native,
with a hand-rolled theme — no component library, no Tailwind.

## The one sentence

Premium, warm and quiet. Golden, but the gold is rare. Subtle shadows, real motion, nothing shouts.

## Fixed points

1. **The app icon is the anchor.** A pale cream crumpet on a marigold ground, `#F5AC1B`. It does not
   change. Every colour decision answers to it.
2. **Light-first.** The page is a warm off-white, `#FAF6EF`. Dark mode is a port of this palette, not
   a second design, and it is not drawn yet.
3. **Gold has exactly three jobs**: the Home banner wash, the Log chip, and the active tab. A fourth
   drains the meaning from the other three. Gold marks what needs doing.
4. **The tick is teal**, `#10696B`. Gold means "to do", so "done" needs its own colour.
5. **Gold never carries text on white.** `#F0A81C` on white is 2.0:1. A gold label uses
   `--primary-text` `#9E6404`, which clears 4.5:1. Gold as a fill is fine — that is `--on-primary`.
6. **Type is Gabarito over Inter.** A warm geometric for headings, Inter for body. Not an editorial
   serif — a magazine serif on a pet app reads as borrowed.
7. **There is no colour per pet.** A pet is told apart by its photo, a member by their avatar. A
   colour per pet would compete with the photo beside it and would need a rule for the fifth pet.
8. **Australian and British English** in every word a user reads. Colour, organise, cancelled,
   favourite, grey. "Tick", never "check".

## Home — the hub

The order is fixed and it is not negotiable: **the log loop comes first.** A household opens this app
to log a feed. Anything that pushes that below the fold is wrong, however good it looks.

```
banner  ->  pet cards  ->  tile grid  ->  contextual tip
```

- **Banner.** One rounded card, a soft gold gradient wash, not a flat block. It holds a greeting
  ("Good morning, Dylan"), the date, and the count of feeds still to log. On the right, a sun,
  sunset or moon that follows the time of day. Four states: dawn, day, dusk, night. The night state
  is the only dark surface in light mode, and that is the point.
- **Pet cards.** One card per pet. Collapsed to a row when everything is logged, expanded otherwise.
  Avatar, name, and one line that says what to do about this pet right now. Expanded, it lists each
  feed time with a Log chip, a tick, or "Upcoming".
- **The "Other" row.** Last row inside each expanded pet card, for a snack or an unscheduled feed.
  Drawn as a dashed ghost row, deliberately quieter than a real feed time, so it reads as an offer
  and not as something nobody has logged.
- **Tiles.** Four: Pets, Activity, Household, Care Card. Two rows of two. Icons are warm ink on a
  sunk well, never gold.
- **Tip.** One card, and only when there is something real to say — "Miso has no dinner set up",
  drawn from the household's actual state. When there is nothing, show nothing. Never a generic
  pet tip, because filler in the one hub slot is worse than an empty slot.

**There is no floating action popover.** It was removed. Every log path now lives inside a pet card.

## Posts — the feed

A private, household-only photo feed. Photos on white, page colour as the divider band between
posts. **Gold is almost banned here** — there is no primary action and no state, so nothing earns
it except the compose button and the tab. Let the photos carry the colour.

## Motion

Restrained and purposeful. Three principles, borrowed from the Family wallet app and agreed:
simplicity, fluidity, delight. Motion explains where you are, it does not decorate.

- The banner's sun breathes on a slow loop. It stops under reduced motion.
- The pet card expands and collapses; the caret rotates with it.
- A logged feed swaps its Log chip for a tick, and the tick arrives after the chip leaves.
- Nothing else animates yet.

## What is already designed

Four artboards, in `crumpet-directions/`, as plain HTML:

| File | What it is |
|---|---|
| `Main.dc.html` | Home, light, the whole scroll |
| `Posts.dc.html` | The Posts feed, light |
| `Daylight.dc.html` | The banner in all four time-of-day states |
| `Tokens.dc.html` | The palette, type and elevation sheet |

`tokens.css` holds every value.

## What is not designed

- **Dark mode.** A port of the light palette. Not drawn.
- **Every screen except Home and Posts.** Pet detail, Activity, Profile, Settings, the sign-in flow,
  onboarding, and the trays. They follow from the tokens.

## Traps worth knowing

- The teal palette is **gone from the code**. Commit `80e9ca3` put the golden values into
  `src/constants/theme.ts`: background `#FAF6EF`, primary `#F0A81C`, primaryText `#9E6404`.
  That branch is not pushed, so **GitHub still serves teal** — when setting up a design system,
  link the local folder, never the repo URL.
- The old light page was `#F1F2F5`, a **cool** grey. That single value was most of why gold never
  looked right in this app.
- `MainButton` draws its primary fill from `colors.primary` and its label from `colors.onPrimary`.
  With gold as primary, `onPrimary` must become near-black. White on gold is unreadable.
