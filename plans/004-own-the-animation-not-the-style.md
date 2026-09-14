# 004 — Drive two animations from shared values, not from inside useAnimatedStyle

- **Status**: DONE
- **Commit**: 752e7b1
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 2 files, about 20 lines each

## Problem

Two components call `withTiming` inside the body of `useAnimatedStyle`.

```tsx
// src/components/screens/home/week-strip.tsx:160 — current
const underlineStyle = useAnimatedStyle(() => {
  const left = selectedIndex * (cellWidth + theme.spacing.one) + (cellWidth - UNDERLINE_WIDTH) / 2;

  return {
    opacity: selectedIndex < 0 ? 0 : 1,
    transform: [{ translateX: withTiming(Math.max(0, left), { duration: SLIDE_MS }) }]
  };
});
```

```tsx
// src/components/screens/home/pet-section.tsx:98 — current
const caretStyle = useAnimatedStyle(() => ({
  transform: [
    {
      rotate: withTiming(isOpen ? '180deg' : '0deg', {
        duration: isOpen ? EXPAND_MS : COLLAPSE_MS
      })
    }
  ]
});
```

Reanimated allows this, but the animation is then owned by the style rather than
by a value. The worklet re-runs whenever anything it closes over changes, and
each re-run starts a new animation toward the current target. In `week-strip`
the closure reads `selectedIndex`, `cellWidth` and `theme.spacing.one`, and the
component sits inside a paging list on the busiest screen in the app. A
re-render mid-slide restarts the slide.

There is a second, quieter cost: the target is recomputed on the UI thread every
time the style is evaluated, rather than once when the selection changes.

## Target

A shared value, set in an effect, read by a style that only reads.

```tsx
// target — src/components/screens/home/week-strip.tsx
const translateX = useSharedValue(0);

const left =
  selectedIndex < 0
    ? 0
    : Math.max(
        0,
        selectedIndex * (cellWidth + theme.spacing.one) + (cellWidth - UNDERLINE_WIDTH) / 2
      );

useEffect(() => {
  translateX.set(withTiming(left, { duration: SLIDE_MS }));
}, [left, translateX]);

const underlineStyle = useAnimatedStyle(() => ({
  opacity: selectedIndex < 0 ? 0 : 1,
  transform: [{ translateX: translateX.get() }]
}));
```

```tsx
// target — src/components/screens/home/pet-section.tsx
const rotation = useSharedValue(isOpen ? 180 : 0);

useEffect(() => {
  rotation.set(withTiming(isOpen ? 180 : 0, { duration: isOpen ? EXPAND_MS : COLLAPSE_MS }));
}, [isOpen, rotation]);

const caretStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${rotation.get()}deg` }]
}));
```

Keep `SLIDE_MS` at 260, `EXPAND_MS` at 220 and `COLLAPSE_MS` at 160.

The asymmetry in `pet-section` is deliberate — the caret opens slower than it
closes. Preserve it exactly.

## Repo conventions to follow

- `src/components/core/accordion.tsx:68-80` is the exemplar. It holds a
  `rotation` shared value, sets it with `withTiming` in a `useEffect`, and reads
  it with `.get()` inside the style. Copy that shape.
- This codebase uses the Reanimated 4 accessor form, `.get()` and `.set()`, in
  newer files. Use it in both edits.

## Steps

1. In `week-strip.tsx`, add `useEffect` to the `react` import and
   `useSharedValue` to the `react-native-reanimated` import.
2. Add the `translateX` shared value and compute `left` outside the worklet,
   exactly as shown under Target.
3. Add the effect and simplify `underlineStyle` to read the value only.
4. In `pet-section.tsx`, add `useEffect` to the `react` import and
   `useSharedValue` to the `react-native-reanimated` import.
5. Seed `rotation` at `isOpen ? 180 : 0` so a section that starts open does not
   rotate its caret on mount.
6. Add the effect and simplify `caretStyle` to read the value only.

## Boundaries

- Do NOT change `SLIDE_MS`, `EXPAND_MS`, `COLLAPSE_MS` or `UNDERLINE_WIDTH`.
- Do NOT change the `LinearTransition`, `FadeIn` or `FadeOut` entries in
  `pet-section.tsx`.
- Do NOT change the list, the paging, or the layout maths in `week-strip.tsx`
  beyond moving the `left` calculation out of the worklet.
- Do NOT touch any other file.

## Verification

- **Mechanical**:

  ```bash
  export PATH="$HOME/.volta/bin:$PATH" && bun run check
  ```

  ESLint's exhaustive-deps rule must be satisfied without a disable comment. If
  it cannot be, STOP and report rather than adding one.

- **Feel check**: on Home, confirm:
  - Tapping across the week slides the underline once per tap, smoothly, with no
    restart or stutter part way.
  - Swiping between weeks does not leave the underline in the wrong place or
    make it jump.
  - A week with no selected day shows no underline.
  - A Pet card that starts collapsed shows its caret pointing down at mount, not
    rotating into place.
  - Tapping a Pet card header rotates the caret with the card, closing faster
    than it opens.
- **Done when**: neither file calls `withTiming` inside a `useAnimatedStyle`
  body, and the checks above hold.
