# 001 — Animate the feed-log confirmation on OccurrenceRow

- **Status**: DONE
- **Commit**: 0298ba5
- **Severity**: MEDIUM
- **Category**: Missed opportunities (AUDIT.md §8), with Physicality & origin (§3)
- **Estimated scope**: 1 file, about 40 changed lines

## Problem

`OccurrenceRow` is the row a member taps to log a feed. It is the core loop of the
product. When the log lands, three things change in a single frame with no bridge:

1. The `Log` button is unmounted and a tick `Icon` is mounted in its place.
2. The trailing slot changes width, so the row's contents jump sideways.
3. The detail line swaps from the feeding instructions to `"Dylan, 8:02 am"`.

The result is a hard cut at the one moment the app confirms the user's most
important action. AUDIT.md §8 names this class directly: "State changes that
teleport (content swaps, layout jumps) where a brief transition would prevent a
jarring change."

Current code, `src/components/ui/occurrence-row.tsx:70-87`:

```tsx
      {isFed ? (
        <Icon name="check" size={20} color="primary" />
      ) : onLog ? (
        <MainButton
          text="Log"
          size="xs"
          // MainButton stretches by default, which in a row means it fills the
          // row's height. The Log button is a chip, not a bar.
          containerStyle={styles.logButton}
          isLoading={isLogging}
          isDisabled={isLogging}
          onPress={onLog}
        />
      ) : (
        <AppText size={13} color="textSecondary">
          Upcoming
        </AppText>
      )}
```

The detail line, `src/components/ui/occurrence-row.tsx:60-66`:

```tsx
        {detail ? (
          <AppText size={13} color="textSecondary" numberOfLines={2}>
            {detail}
          </AppText>
        ) : null}
```

The row is keyed on `occurrence.seriesId` by its parent
(`src/components/ui/occurrence-list.tsx:35`), so the row instance survives the
state change. Entering and exiting animations will therefore fire on the inner
elements. Do not change that key.

## Target

Three changes, all on `transform` and `opacity` only.

**1. The trailing slot animates its own width change.** Wrap the whole
conditional in an `Animated.View` carrying a layout animation:

```tsx
const SLOT_MS = 220;
const EXIT_MS = 120;

const SlotReflow = LinearTransition.duration(SLOT_MS).reduceMotion(ReduceMotion.System);
```

**2. The tick grows in. It never starts from `scale(0)`.** AUDIT.md §3 forbids
`scale(0)` — nothing in the real world appears from nothing. Reanimated's
built-in `ZoomIn` starts at scale 0, so it must not be used here. Use an explicit
`Keyframe` that starts at `0.9`, overshoots gently to `1.06`, and settles:

```tsx
const TickIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  55: {
    opacity: 1,
    transform: [{ scale: 1.06 }],
    easing: Easing.bezier(0.23, 1, 0.32, 1)
  },
  100: { opacity: 1, transform: [{ scale: 1 }] }
})
  .duration(200)
  .reduceMotion(ReduceMotion.System);
```

`Easing.bezier(0.23, 1, 0.32, 1)` is the strong ease-out curve from AUDIT.md §2.
Entering elements use ease-out. Do not substitute a different curve.

**3. The Log button leaves faster than the tick arrives.** AUDIT.md §4 calls for
asymmetric timing: the system's response snaps.

```tsx
const SlotOut = FadeOut.duration(EXIT_MS).reduceMotion(ReduceMotion.System);
```

**4. The detail line cross-fades instead of swapping.** Key the `AppText` on
`occurrence.state` so React unmounts the old string and mounts the new one, and
give the text column a layout animation so a one-line to two-line change slides:

```tsx
const DetailIn = FadeIn.duration(160).reduceMotion(ReduceMotion.System);
```

Total budget: 220 ms. This is inside the under-300 ms rule for UI in AUDIT.md §2.

## Repo conventions to follow

- **Durations are module-level constants in the component file.** This repo has
  no shared motion tokens yet. Do not create one in this plan.
  Exemplar: `src/components/screens/home/pet-section.tsx:29-30`
  (`const EXPAND_MS = 220; const COLLAPSE_MS = 160;`). Reuse `220` and follow
  that naming shape.
- **Every animation carries `.reduceMotion(ReduceMotion.System)`.**
  Exemplar: `src/components/core/accordion.tsx:20-22`, where `Reflow`, `BodyIn`
  and `BodyOut` are declared once at module scope and reused. Declare the four
  animation objects in this plan the same way — at module scope, not inline in
  JSX. NOTE: `ReduceMotion.System` disables the animation outright rather than
  keeping the opacity and dropping the movement. That is weaker than AUDIT.md §6
  asks for, but it is what every other animated component here does, and a
  parallel pattern in one file would be worse. Do not change it.
- **The best exemplar for the whole shape is
  `src/components/screens/home/pet-section.tsx:132-182`**: an `Animated.View`
  with `layout={LinearTransition.duration(EXPAND_MS)}` on the outside, and
  `entering` / `exiting` on the content that swaps. Imitate it.
- Import style: a default `Animated` import plus named members from
  `react-native-reanimated`, as in `pet-section.tsx:21-27`.

## Steps

1. In `src/components/ui/occurrence-row.tsx`, replace the
   `import { StyleSheet, View } from 'react-native';` line's neighbourhood by
   adding this import after it:

   ```tsx
   import Animated, {
     Easing,
     FadeIn,
     FadeOut,
     Keyframe,
     LinearTransition,
     ReduceMotion
   } from 'react-native-reanimated';
   ```

2. Directly below the existing `labelText` record (line 22-27), add the four
   module-level constants exactly as written in the **Target** section above:
   `SLOT_MS`, `EXIT_MS`, `SlotReflow`, `TickIn`, `SlotOut`, `DetailIn`.

3. Replace the detail block at lines 60-66 with a keyed, animated version:

   ```tsx
           {detail ? (
             <Animated.View key={occurrence.state} entering={DetailIn}>
               <AppText size={13} color="textSecondary" numberOfLines={2}>
                 {detail}
               </AppText>
             </Animated.View>
           ) : null}
   ```

4. Add the layout animation to the text column so a change in the number of
   lines slides. Change `<View style={styles.text}>` at line 54 to:

   ```tsx
         <Animated.View style={styles.text} layout={SlotReflow}>
   ```

   and change its matching `</View>` (line 68) to `</Animated.View>`.

5. Replace the trailing-slot conditional at lines 70-87 with:

   ```tsx
         <Animated.View layout={SlotReflow}>
           {isFed ? (
             <Animated.View entering={TickIn}>
               <Icon name="check" size={20} color="primary" />
             </Animated.View>
           ) : onLog ? (
             <Animated.View exiting={SlotOut}>
               <MainButton
                 text="Log"
                 size="xs"
                 // MainButton stretches by default, which in a row means it fills
                 // the row's height. The Log button is a chip, not a bar.
                 containerStyle={styles.logButton}
                 isLoading={isLogging}
                 isDisabled={isLogging}
                 onPress={onLog}
               />
             </Animated.View>
           ) : (
             <AppText size={13} color="textSecondary">
               Upcoming
             </AppText>
           )}
         </Animated.View>
   ```

6. Leave `styles.logButton` (`{ alignSelf: 'center' }`) as it is. If the Log
   button now stretches vertically because of the new wrapper, add
   `alignSelf: 'center'` to the new `Animated.View` wrapper's inline style
   rather than changing the existing style object.

## Boundaries

- Do NOT touch `src/components/ui/occurrence-list.tsx`, `use-log-flow.ts`,
  `use-feed-log-mutations.ts`, or any query hook. The write path is out of scope.
- Do NOT change the `key={occurrence.seriesId}` on the parent list. The
  animations depend on the row instance surviving the state change.
- Do NOT add a haptic. The log flow owns that decision.
- Do NOT create shared motion tokens in `src/constants/theme.ts`. That is a
  separate piece of work.
- Do NOT change the copy, the `detail` logic, the `labelText` map, or any
  accessibility label.
- Do NOT animate `width`, `height`, `padding` or any colour. `transform`,
  `opacity` and Reanimated's own `layout` only.
- Do NOT add a dependency. `react-native-reanimated@4.5.1` is already present.
- If a step does not match the code you find, STOP and report. Do not improvise.

## Verification

- **Mechanical**: run `bun run check` from the repo root. Typecheck, lint,
  spellcheck and Jest must all pass. If cspell fails on a word such as
  `Keyframe`, add it to `cspell.json` rather than disabling the rule.
- **Feel check** — this must be done on a real iOS device or simulator, not in
  Jest. Jest renders mocks and will tell you nothing about the feel.
  1. Open Home. Expand a pet section that has a `due` feed.
  2. Tap `Log` and confirm in the tray. Watch the trailing slot:
     - The tick grows from about 90 % of its size. It must never appear from
       nothing, and it must never pop from full size.
     - The overshoot is barely visible. If it reads as bouncy, the value is
       wrong — it is `1.06`, not more.
     - The `Log` button fades out faster than the tick fades in.
     - The row's text does not jump sideways as the slot changes width.
  3. Watch the detail line in the same moment. The instructions must cross-fade
     into `"<name>, <time>"`. Two overlapping strings must not be readable at
     once. If they are, the fade is too slow — drop `DetailIn` to `120`.
  4. Log a feed for a pet whose instructions run to two lines. The row's height
     must slide, not snap.
  5. Open a logged row, correct the time, and save. Confirm the row settles
     without the tick replaying from scratch. NOTE: `Keyframe` restarts from
     frame zero when interrupted (AUDIT.md §4). That is acceptable here because
     the state changes once per occurrence and reversing it needs a sheet, but
     if a correction visibly re-plays the tick, report it rather than fixing it
     in this plan.
  6. Turn on Settings → Accessibility → Motion → Reduce Motion. Repeat step 2.
     Every one of these animations must be skipped, and the row must still reach
     the correct final state.
- **Done when**: `bun run check` passes, and steps 2, 3, 4 and 6 of the feel
  check all read as described on a device.
