---
status: accepted
---

# A tray is one sheet whose content swaps, not a sheet per step

A sequenced edit — like editing the feeding schedule — is one `TrueSheet` (via `Tray`,
`src/components/core/tray.tsx`). Moving between steps swaps the content inside that one sheet and
resizes it; it does not present a new sheet.

## Considered options

- **A sheet per step, pushed on top of the last one** — rejected. ADR 0010 and AGENTS.md already
  record that iOS handles a modal stacked on a native sheet badly. Chaining sheets is the same
  problem twice over: two `UISheetPresentationController`s competing for the same gesture space.
- **One fixed-height sheet, steps scroll within it** — rejected. A fixed height either wastes space
  on a short step or clips a tall one, and it gives the user no sense that they have moved forward.
  Height changing with the step is what makes the sequence read as progress, not just a stack of
  waiting content.
- **One sheet, height animates per step** (chosen). `Tray` keeps a single `BaseSheet` with
  `detents={['auto']}` and swaps the active `TrayStep`'s content. After the new step renders, an
  effect calls `sheetRef.current?.resize(0)` — index 0 because `['auto']` has exactly one detent —
  and the sheet animates to the new content's natural height.

## Consequences

- **The resize has to happen in an effect, not inline.** `setHistory` is async, so calling `resize`
  right after it — inside `goTo` or `back` — would fire before React has rendered the new step, and
  would measure the outgoing step's height instead. `Tray` defers the call to a `useEffect` keyed on
  `activeId`, which only runs once the new step is on screen.
- **`resize` must not run before the sheet is presented.** Calling it earlier rejects with "No sheet
  found with tag N". `Tray` tracks an `isPresented` flag, set from `BaseSheet`'s `onPresent`, and the
  resize effect bails out until it is true.
- **Step content must be measurable.** The animation depends on the new step settling to a real
  height. A step whose content can't settle — for example something still loading, or laid out with
  an indeterminate height — will not resize correctly and the sheet will not read as progressing.
- One `Tray` still means one sheet in the native sense: `TrayStep` only changes what's inside it.
  `BaseSheet`'s existing rules (theme at render, `TrueSheet` imported as a value only inside
  `base-sheet.tsx`) apply unchanged.
