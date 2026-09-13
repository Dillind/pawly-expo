# 001 — Delete the dead Expo template motion files

- **Status**: DONE
- **Commit**: 752e7b1
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 2 files deleted, up to 2 asset files deleted

## Problem

Two files carry animation code that nothing renders. Both arrived with the Expo
template and were never removed.

`src/components/animated-icon.tsx` exports `AnimatedSplashOverlay` and
`AnimatedIcon`. Neither is imported anywhere in `src`. It also animates Expo's
own branding, not Crumpet's:

```tsx
// src/components/animated-icon.tsx:7 — current
const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
```

```tsx
// src/components/animated-icon.tsx:74 — current
const glowKeyframe = new Keyframe({
  0: { transform: [{ rotateZ: '0deg' }] },
  100: { transform: [{ rotateZ: '7200deg' }] }
});
```

```tsx
// src/components/animated-icon.tsx:127 — current
backgroundSolidColor: {
  ...StyleSheet.absoluteFill,
  backgroundColor: '#208AEF',
  zIndex: 1000
}
```

That is a scale of about 9x on a 810pt screen, a glow that spins 7200 degrees
over four minutes, and Expo's blue. The repo now has a real animated splash at
`src/components/screens/splash/animated-splash.tsx`, so this file is both dead
and a decoy — the next reader has two splash overlays to choose between.

`src/components/ui/parallax-scroll-view.tsx` exports `ParallaxScrollView`, also
unreferenced, and also from the template.

This matters because dead motion code is copied. A file in the repo reads as an
example of how the repo does things.

## Target

Both files gone. Both Expo-branded image assets gone, if nothing else uses them.

## Repo conventions to follow

- The real splash is `src/components/screens/splash/animated-splash.tsx`. It is
  the only splash overlay after this change.
- Assets live in `assets/images/`. `AGENTS.md` treats an unused asset the same
  as unused code.

## Steps

1. Confirm both are unused. Run each command and expect no output other than the
   file's own definition:

   ```bash
   grep -rn "animated-icon\|AnimatedIcon\|AnimatedSplashOverlay" src app.config.ts
   grep -rn "parallax-scroll-view\|ParallaxScrollView" src app.config.ts
   ```

   If either returns a real import, STOP and report.

2. Delete `src/components/animated-icon.tsx`.
3. Delete `src/components/ui/parallax-scroll-view.tsx`.
4. Check the two image assets:

   ```bash
   grep -rn "expo-logo\|logo-glow" src assets app.config.ts
   ```

   If nothing outside the deleted files refers to them, delete
   `assets/images/expo-logo.png` and `assets/images/logo-glow.png`.

5. If `expo-logo` or `logo-glow` appears in `cspell.json`, leave it. Removing a
   dictionary word is not part of this plan.

## Boundaries

- Do NOT touch `src/components/screens/splash/`.
- Do NOT delete any other file in `src/components/ui/`.
- Do NOT add dependencies.
- If a grep in step 1 or step 4 shows a live reference, STOP and report.

## Verification

- **Mechanical**: `bun run check` passes. Run it with the Volta Node on the path
  or the spellcheck stage fails for an unrelated reason:

  ```bash
  export PATH="$HOME/.volta/bin:$PATH" && bun run check
  ```

- **Feel check**: none needed. Nothing rendered this code.
- **Done when**: both files are absent, `bun run check` passes, and
  `grep -rn "AnimatedIcon" src` returns nothing.
