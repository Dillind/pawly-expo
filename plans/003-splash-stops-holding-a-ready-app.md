# 003 — Stop the splash holding a ready app, and fix its exit

- **Status**: DONE
- **Commit**: 752e7b1
- **Severity**: HIGH
- **Category**: Purpose & frequency, easing, physicality
- **Estimated scope**: 1 file, about 25 lines

## Problem

Four separate issues in `src/components/screens/splash/animated-splash.tsx`.

**1. A ready app is held behind the overlay for 1020 ms.**

```tsx
// src/components/screens/splash/animated-splash.tsx:28 — current
const SEQUENCE_MS = 900;
const MIN_HOLD_MS = SEQUENCE_MS + 120;
```

The exit effect will not run until `hasPlayed` is true, and `hasPlayed` is set
by a timer of `MIN_HOLD_MS`. On a warm start the app is ready long before that
and waits for an animation instead. Motion must never delay real progress.

**2. `SEQUENCE_MS` is wrong, so the exit clips the last head.**

```tsx
// src/components/screens/splash/animated-splash.tsx:53 — current
const COMPANIONS: Companion[] = [
  { kind: 'retriever', left: 4, top: 24, size: 56, delayMs: 280 },
  { kind: 'tabby', left: 192, top: 4, size: 48, delayMs: 360 },
  { kind: 'shorthair', left: 0, top: 178, size: 50, delayMs: 440 },
  { kind: 'westie', left: 196, top: 170, size: 52, delayMs: 520 }
];
```

The last head starts its rise at 520 + 110 = 630 ms. `RISE` is
`{ damping: 14, stiffness: 170, mass: 0.8 }`, a damping ratio of 0.60, which
settles about 460 ms later — near 1090 ms. `SEQUENCE_MS` claims 900. The first
pop at 280 ms is also dead air: the overlay opens on a still hero.

**3. The exit fade starts slowly.**

```tsx
// src/components/screens/splash/animated-splash.tsx:158 — current
field.value = withTiming(0, { duration: EXIT_MS }, (isDone) => {
  if (isDone) runOnJS(onFinish)();
});
```

Reanimated's default easing is `Easing.inOut(Easing.quad)`. An exit must start
fast. This one eases in on the exact frame the user is waiting for.

**4. The fade of each companion is driven by a spring that overshoots.**

```tsx
// src/components/screens/splash/animated-splash.tsx:91 — current
const groupStyle = useAnimatedStyle(() => ({
  opacity: pop.value,
  transform: [{ scale: 0.4 + pop.value * 0.6 }]
}));
```

`POP` has a damping ratio of about 0.48, so `pop.value` rises past 1 and comes
back. The scale wants that bounce. The opacity does not — it is clamped above 1,
so part of the curve is spent invisible.

## Target

```tsx
// target — constants
/** The whole sequence, from the first pop to the last head settling. */
const SEQUENCE_MS = 930;

/**
 * A floor that stops the overlay flashing past, not a wait for the sequence.
 * A ready app leaves early and the remaining pops play out under the fade --
 * an animation cut short by real progress reads as fast, one that holds real
 * progress reads as slow.
 */
const MIN_HOLD_MS = 400;

const EXIT_MS = 240;
```

```tsx
// target — companions, 80ms stagger starting at 120ms
const COMPANIONS: Companion[] = [
  { kind: 'retriever', left: 4, top: 24, size: 56, delayMs: 120 },
  { kind: 'tabby', left: 192, top: 4, size: 48, delayMs: 200 },
  { kind: 'shorthair', left: 0, top: 178, size: 50, delayMs: 280 },
  { kind: 'westie', left: 196, top: 170, size: 52, delayMs: 360 }
];
```

```tsx
// target — a fade that does not inherit the spring's bounce
const pop = useSharedValue(isStill ? 1 : 0);
const fade = useSharedValue(isStill ? 1 : 0);
const peek = useSharedValue(isStill ? 1 : 0);

// in the effect, alongside the existing two:
fade.value = withDelay(delayMs, withTiming(1, { duration: 160 }));

const groupStyle = useAnimatedStyle(() => ({
  opacity: fade.value,
  transform: [{ scale: 0.4 + pop.value * 0.6 }]
}));
```

```tsx
// target — the exit
field.value = withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.quad) }, (isDone) => {
  if (isDone) runOnJS(onFinish)();
});

// A gold field and the first screen share nothing, so a bare crossfade reads as
// a cut. A small push-through joins them.
const fieldStyle = useAnimatedStyle(() => ({
  opacity: field.value,
  transform: [{ scale: 1 + (1 - field.value) * 0.04 }]
}));
```

```ts
// target — styles.group
group: {
  flex: 1,
  // The crumpet rises from the surface. A centre origin grows it out of the air.
  transformOrigin: 'bottom'
}
```

`Easing` must be added to the existing `react-native-reanimated` import.

Do not change `HERO_SIZE`, `MAX_HOLD_MS`, `POP`, `RISE`, the `headBox` /
`headHidden` / `headRest` values, or the status bar interval.

## Repo conventions to follow

- Constants are `CONSTANT_CASE` at module scope with a comment giving the
  reason, not the value. The file already does this.
- Reduced motion is handled by `useReducedMotion()` seeding every shared value
  at its rest state. The new `fade` value must follow that: `isStill ? 1 : 0`.

## Steps

1. Add `Easing` to the import from `react-native-reanimated`.
2. Replace `SEQUENCE_MS` and `MIN_HOLD_MS` with the target values and comments.
3. Replace the four `delayMs` values in `COMPANIONS` with 120, 200, 280, 360.
   Change nothing else in that array.
4. In `PoppingCompanion`, add the `fade` shared value seeded `isStill ? 1 : 0`.
5. In the same effect that sets `pop` and `peek`, add the `fade` line. Add
   `fade` to the effect's dependency array.
6. Change `groupStyle` to read `opacity: fade.value`. Leave the scale on
   `pop.value`.
7. Add `easing: Easing.out(Easing.quad)` to the exit `withTiming` options.
8. Add the scale transform to `fieldStyle`, with the comment above it.
9. Add `transformOrigin: 'bottom'` to `styles.group`, with the comment above it.

## Boundaries

- Do NOT touch `src/components/screens/splash/pet-head.tsx`.
- Do NOT touch `app.config.ts`. `HERO_SIZE` must keep matching `imageWidth`.
- Do NOT change `MAX_HOLD_MS` — a failed profile query still needs its ceiling.
- Do NOT remove the status bar interval. It is a documented workaround.
- Do NOT add dependencies.

## Verification

- **Mechanical**:

  ```bash
  export PATH="$HOME/.volta/bin:$PATH" && bun run check
  ```

- **Feel check**: this needs a device, not a Metro reload. The splash lives about
  1.1 s, so to inspect it raise `MIN_HOLD_MS` to 6000 temporarily, look, then
  restore it. Confirm:
  - The first head pops almost at once. There is no still hero at the start.
  - The hero never moves during the pops.
  - The heads rise from behind their crumpets, not out of the air.
  - The gold pushes very slightly toward the viewer as it fades, and the fade
    starts immediately rather than creeping.
  - On a warm start the overlay leaves early with pops still running. Judge
    whether that reads as fast or as unfinished. If it reads as unfinished,
    raise `MIN_HOLD_MS` toward 600, never back to 1020.
  - Turn on Reduce Motion in Settings. The heads must be in place with no
    movement, and the overlay must still fade out.
- **Done when**: `MIN_HOLD_MS` no longer derives from `SEQUENCE_MS`, the exit
  names an easing, and the checks above hold on a device.
