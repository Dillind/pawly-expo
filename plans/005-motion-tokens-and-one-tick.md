# 005 — Give motion shared tokens, and make the two tick rows actually match

- **Status**: DONE
- **Commit**: 752e7b1
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 new file, 2 files edited

## Problem

**1. There are no motion tokens.** `src/constants/theme.ts` exports `Spacing`
and `Radius`, so spacing and corners are a system. Motion is not. Fourteen
durations are hand-typed across fifteen files: 100, 120, 140, 150, 160, 180,
220, 240, 260, 280, 300, 400, 420, 600, 800. Nothing says which of 140 and 160
is "the exit", so the next component picks a third number.

**2. Two rows claim to share one motion and do not.** `reminder-row.tsx` says so
in a comment, then uses different values.

```tsx
// src/components/ui/occurrence-row.tsx:38 — current
const SLOT_MS = 220;
const EXIT_MS = 140;
const TICK_MS = 160;
```

```tsx
// src/components/ui/occurrence-row.tsx:45 — current
const TickIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  45: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
    easing: Easing.bezier(0.34, 1.56, 0.64, 1)
  },
  75: { opacity: 1, transform: [{ scale: 0.98 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] }
});
```

```tsx
// src/components/ui/reminder-row.tsx:35 — current
const ROW_MS = 220;
const EXIT_MS = 120;
const TICK_MS = 160;

// The same motion as a logged feed, because it is the same row.
const RowReflow = LinearTransition.duration(ROW_MS).reduceMotion(ReduceMotion.System);

const TickIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  55: {
    opacity: 1,
    transform: [{ scale: 1.06 }],
    easing: Easing.bezier(0.23, 1, 0.32, 1)
  },
  100: { opacity: 1, transform: [{ scale: 1 }] }
});
```

The comment is the intent. The code is a different overshoot, a different peak,
no settle stop, and an exit 20 ms shorter. Ticking a feed and ticking a reminder
are the same gesture in the same list and must land the same way.

`occurrence-row`'s version is the one to keep. Its shape is documented against
issue #122 and it has the settle stop at 75.

## Target

A new `src/constants/motion.ts` owning every duration and curve, and both rows
reading from it.

```ts
// target — src/constants/motion.ts (new file)
import { Easing } from 'react-native-reanimated';

/**
 * Motion tokens. Durations are the same kind of system as Spacing and Radius:
 * pick the one that names the moment, never a new number.
 *
 * Reanimated's own default easing is inOut, which starts slowly. Anything a
 * user is waiting on wants `Curve.out`.
 */
export const Duration = {
  /** A press answering a finger. */
  press: 100,
  /** Something leaving. Always shorter than the thing arriving. */
  exit: 140,
  /** A small element arriving, or a label swapping. */
  quick: 160,
  /** A panel or body fading in. */
  enter: 180,
  /** A list or card re-laying itself out. */
  reflow: 220,
  /** An indicator travelling across a track. */
  slide: 260
} as const;

export const Curve = {
  /** Strong ease-out. The default for anything entering or leaving. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** Overshoot, for a confirmation that should feel physical. */
  overshoot: Easing.bezier(0.34, 1.56, 0.64, 1)
} as const;
```

```tsx
// target — src/components/ui/reminder-row.tsx, replacing its three constants
// and its TickIn
import { Curve, Duration } from '@/constants/motion';

// The same motion as a logged feed, because it is the same row. Change both or
// neither -- see src/components/ui/occurrence-row.tsx.
const RowReflow = LinearTransition.duration(Duration.reflow).reduceMotion(ReduceMotion.System);

const TickIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  45: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
    easing: Curve.overshoot
  },
  75: { opacity: 1, transform: [{ scale: 0.98 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] }
})
  .duration(Duration.quick)
  .delay(Duration.exit)
  .reduceMotion(ReduceMotion.System);

const ChipOut = FadeOut.duration(Duration.exit).reduceMotion(ReduceMotion.System);
const LabelIn = FadeIn.duration(Duration.quick).reduceMotion(ReduceMotion.System);
```

```tsx
// target — src/components/ui/occurrence-row.tsx, same tokens, same values
const SlotReflow = LinearTransition.duration(Duration.reflow).reduceMotion(ReduceMotion.System);
// TickIn keeps its exact keyframe, with Curve.overshoot in place of the inline bezier,
// .duration(Duration.quick) and .delay(Duration.exit).
const SlotOut = FadeOut.duration(Duration.exit)...   // whatever the file currently has
const DetailIn = FadeIn.duration(Duration.quick).reduceMotion(ReduceMotion.System);
```

Every number in `occurrence-row` is unchanged: 220 becomes `Duration.reflow`,
140 becomes `Duration.exit`, 160 becomes `Duration.quick`. Only `reminder-row`
changes behaviour, and only to match.

## Repo conventions to follow

- One file owns a primitive. `src/constants/icon-map.ts` is the only file that
  imports `lucide-react-native`; `base-sheet.tsx` is the only value import of
  `TrueSheet`. `motion.ts` follows that shape for `Easing`, which is why the
  curves do not go in `theme.ts`.
- Constant data is `CONSTANT_CASE`, but these are namespaced objects like
  `Spacing` and `Radius`, so they keep that form: `Duration.exit`, `Curve.out`.
- Path alias: import as `@/constants/motion`, never a relative path.
- `src/constants/theme.ts:213` is the exemplar for the token block's shape.

## Steps

1. Create `src/constants/motion.ts` with the content under Target.
2. In `occurrence-row.tsx`, delete `SLOT_MS`, `EXIT_MS` and `TICK_MS`, import
   `Curve` and `Duration`, and replace each use with the matching token. Replace
   the inline `Easing.bezier(0.34, 1.56, 0.64, 1)` with `Curve.overshoot`.
3. Remove the now-unused `Easing` import from `occurrence-row.tsx` if nothing
   else in the file uses it.
4. In `reminder-row.tsx`, delete `ROW_MS`, `EXIT_MS` and `TICK_MS` and import
   the tokens.
5. Replace `reminder-row`'s `TickIn` keyframe with the one under Target — the
   45/75/100 stops and `Curve.overshoot`.
6. Extend the existing comment above `RowReflow` to say that the two files must
   change together.
7. Remove the now-unused `Easing` import from `reminder-row.tsx` if nothing else
   in the file uses it.
8. Add `motion` to `cspell.json` only if the spellcheck stage asks for it. It
   should not.

## Boundaries

- Do NOT migrate any other file to the tokens in this plan. Thirteen more files
  hold hand-typed durations; converting them is a separate change and a much
  larger diff. This plan establishes the tokens and converts the two files whose
  inconsistency is a real bug.
- Do NOT change any value in `occurrence-row.tsx`. It is the reference.
- Do NOT change `KIND_COLOUR` or any layout, copy or colour in either row.
- Do NOT add `Duration` entries that no call site uses.
- Do NOT add dependencies.

## Verification

- **Mechanical**:

  ```bash
  export PATH="$HOME/.volta/bin:$PATH" && bun run check
  ```

  Watch for a Jest failure. `motion.ts` calls `Easing.bezier` at module scope, so
  any test that imports a component using it now evaluates that call under the
  `jest-expo` mock. If a suite fails on it, STOP and report — do not mock
  `Easing` in the test setup without saying so.

- **Feel check**: on Home, tick a reminder and log a feed on the same screen, one
  after the other. Confirm:
  - Both ticks pop with the same overshoot and settle back the same way.
  - Neither tick overlaps the button leaving. The button goes, then the tick
    arrives.
  - Watch them a second time in slow motion if the two still look different — a
    20 ms difference in the exit is visible when they are side by side.
- **Done when**: `src/constants/motion.ts` exists, neither row file declares a
  bare millisecond constant, and the two ticks are indistinguishable.
