# Claude Design prompt — Batch 1: Pet detail, Activity, Pets list

Tickets: CRU-090 (#118), CRU-091 (#119), CRU-092 (#120).

Before pasting: set the **Design system** dropdown to Crumpet (it defaults to None), and set the
template to **Mobile app design**. Then paste everything below the line.

---

Design three iOS screens for Crumpet, a pet-care coordination app. Use the Crumpet design system.

## The app in one line

A household shares a pet. Members log feeds, everyone is notified, and the app flags a feed
nobody logged.

## The visual rules that decide everything

- Premium, warm and quiet. Golden, but the gold is rare.
- Light-first. The page is a warm off-white, #FAF6EF.
- **Gold has exactly three jobs**: the Home banner wash, the Log chip, and the active tab.
  Nothing on these three screens gets gold except a Log chip. A fourth job drains the other three.
- **Gold never carries text.** #F0A81C on white is 2.0:1. A gold label uses #9E6404. Gold as a
  fill is fine, with near-black on top.
- **The tick is teal, #10696B.** Gold means "to do", so "done" needs its own colour.
- **There is no colour per pet.** A pet is told apart by its photo, a member by their avatar.
- Type is Gabarito for headings, Inter for body.
- Australian and British English in every word: colour, organise, cancelled, favourite, grey.
  "Tick", never "check".
- Icons are warm ink on a sunk well, never gold.

## Artboard 1 — Pet detail

Reached by tapping a pet card on Home. One pet, everything about it.

- A photo header with the pet's name.
- The feeding schedule: each feed time as a row, showing a Log chip, a teal tick, or "Upcoming".
- A gallery strip of recent photos, horizontally scrolling.
- The Care Card: the pet's instructions, in a card that can be opened to edit.
- The navigation bar carries one right-hand button for editing details.

## Artboard 2 — Activity

The household's history. Every feed log, newest first.

- Grouped by day, with a sticky day heading.
- Each row: who logged it, which pet, which feed time, and how long ago.
- A missed feed must read differently from a logged one, and **must not use gold** — gold means
  "you can act on this now", and a missed feed in the past is not actionable. Find another
  treatment.
- Design the empty state. A new household has no history.

## Artboard 3 — Pets list

Every pet in the household.

- One row per pet: avatar, name, and one line of status.
- An "Add a pet" affordance at the end of the list.
- Design the empty state.

## Also draw the states

For each artboard, show the empty state and the loading state as smaller artboards beside it.
A loading state is a skeleton in the page colour, never a spinner on a blank screen.

## Naming

Name the exported files PetDetail, Activity and PetsList. The tickets reference those names.

## What not to do

- No floating action button and no action popover. Both were removed deliberately.
- No generic filler content. If there is nothing to say, show nothing.
- No second accent colour. Warm ink and the page colour carry the rest.
