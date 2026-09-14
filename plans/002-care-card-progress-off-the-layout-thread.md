# 002 — Animate the Care Card progress bar with scaleX, not width

- **Status**: DONE
- **Commit**: 752e7b1
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, about 10 lines

## Problem

The Care Card editor's step progress bar animates a percentage width.

```tsx
// src/app/(protected)/(tabs)/home/[petId]/care-card-editor.tsx:53 — current
const progress = useSharedValue((1 / CARE_CARD_STEPS.length) * 100);
const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
```

```tsx
// src/app/(protected)/(tabs)/home/[petId]/care-card-editor.tsx:62 — current
progress.value = withTiming(((next + 1) / CARE_CARD_STEPS.length) * 100, {
  duration: PROGRESS_DURATION_MS
});
```

`width` is a layout property. Every frame of this 260 ms animation runs layout,
then paint, then composite, instead of composite alone. Reanimated runs the
worklet on the UI thread, but the layout pass it triggers is not free, and the
step change happens while the editor is also swapping a whole form step.

Only `transform` and `opacity` are composite-only. This is the one place in the
codebase that animates a layout property.

## Target

The fill is laid out at full width once and scaled horizontally from its left
edge. The shared value becomes a 0-to-1 fraction rather than a percentage.

```tsx
// target
const progress = useSharedValue(1 / CARE_CARD_STEPS.length);
const progressStyle = useAnimatedStyle(() => ({
  transform: [{ scaleX: progress.value }]
}));
```

```tsx
// target
progress.value = withTiming((next + 1) / CARE_CARD_STEPS.length, {
  duration: PROGRESS_DURATION_MS
});
```

```ts
// target — src/app/(protected)/(tabs)/home/[petId]/care-card-editor.tsx, makeStyles
progress: {
  height: 3,
  width: '100%',
  transformOrigin: 'left',
  borderRadius: Radius.full,
  backgroundColor: colors.primary
}
```

`transformOrigin: 'left'` is required. Without it the bar scales about its
centre and shrinks inward from both ends.

`PROGRESS_DURATION_MS` stays at 260. Do not change it.

## Repo conventions to follow

- Styles are built in a module-level `makeStyles` factory read through
  `useStyles`. This file already does that; edit the existing `progress` entry
  inside it, do not add an inline style.
- An exemplar of transform-only animation in this repo:
  `src/components/core/main-button.tsx:78`.

## Steps

1. Open `src/app/(protected)/(tabs)/home/[petId]/care-card-editor.tsx`.
2. Change line 53 so the initial value is a fraction:
   `const progress = useSharedValue(1 / CARE_CARD_STEPS.length);`
3. Change line 54 to the `scaleX` transform shown under Target.
4. In `goTo`, change the `withTiming` target to `(next + 1) / CARE_CARD_STEPS.length`.
   Keep `{ duration: PROGRESS_DURATION_MS }`.
5. In `makeStyles`, add `width: '100%'` and `transformOrigin: 'left'` to the
   `progress` style. Leave `height`, `borderRadius` and `backgroundColor` alone.
6. Leave the `track` style untouched. Its `overflow: 'hidden'` still clips the
   rounded ends.

## Boundaries

- Do NOT change `PROGRESS_DURATION_MS`.
- Do NOT change the step logic, the clamp in `goTo`, or the haptic call.
- Do NOT touch any other file.
- If line 53 or 54 does not match the current code above, STOP and report.

## Verification

- **Mechanical**:

  ```bash
  export PATH="$HOME/.volta/bin:$PATH" && bun run check
  ```

  `tsc` must accept `transformOrigin` on a `ViewStyle`. If it does not, the
  React Native version predates that prop — STOP and report rather than casting.

- **Feel check**: open a Pet, open the Care Card editor, and step forward and
  back through every step. Confirm:
  - The bar grows from the left edge, never from the middle.
  - The bar's right edge stays rounded and inside the track.
  - The first step shows a fill of one step's width, not an empty or full track.
  - Stepping quickly does not leave the bar behind or overshoot its track.
- **Done when**: no `width:` appears inside any `useAnimatedStyle` in the file,
  and the bar behaves as above on a device.
