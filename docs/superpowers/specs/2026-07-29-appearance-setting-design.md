# CRU-004 Appearance Setting — Design

**Date:** 2026-07-29 · **Status:** approved

## Goal

Let a Member choose whether Crumpet follows their phone's appearance or is pinned to light or
dark, from a control on Profile. The choice survives a cold start and never flashes the wrong
theme on launch.

## Scope

**In:** the preference, its persistence, the control on Profile, and the changes strictly required
for the switch to *function* — the five hardcoded `StatusBar` values and the navigation
`ThemeProvider`, both of which currently ignore the theme.

**Out:** making dark mode *look* right. The dark palette exists in `theme.ts` but has almost
certainly never been exercised — every `StatusBar` in the app is hardcoded to `dark`, which is the
tell. Expect a tail of contrast and hardcoded-colour problems on screens nobody has viewed in dark
mode. That is a separate pass, opened after a human has looked at the app on a device. Deliberately
not bundled: it is design work that needs eyes, and burying it here would produce a large diff whose
interesting part is a one-line hook change.

## The preference

`'system' | 'light' | 'dark'`, defaulting to `'system'`.

Three options rather than a Light/Dark toggle because `'system'` is the only value that is
reversible: a two-way switch permanently opts a user out of automatic switching the moment they
touch it, with no way back. Defaulting to `'system'` also means a fresh install behaves exactly as
the app does today.

## Architecture

### One choke point

`src/hooks/use-color-scheme.ts` is currently a one-line re-export of React Native's
`useColorScheme`. Every themed thing in the app — `useTheme()`, `useStyles()`, every `makeStyles`
factory — already reads through it. It becomes the resolver:

```
stored preference === 'system'  ->  React Native's useColorScheme()
otherwise                       ->  the stored preference
```

Nothing else in `src/components` or `src/app` changes to pick up the theme. This is the whole
mechanism, and it is why the change is small.

### Store

A Zustand store, `src/stores/theme-store.ts`, following the project's `State` / `Action` split and
consumed by plain destructure (see AGENTS.md). It holds the preference and a `hasHydrated` flag.

### Persistence

AsyncStorage, one key: `crumpet.themePreference`.

Not SecureStore. SecureStore is backed by the iOS Keychain and Android Keystore, so every read pays
a cryptographic and cross-process cost — slower, in the launch path, for a value that is not a
secret. It also has no real web implementation, and `bun run web` is a supported target.
AsyncStorage is already initialised at startup for the Supabase session, so a second key is
effectively free.

A read failure falls back to `'system'`: the app follows the phone, which is the same behaviour as
never having chosen.

### Hydration

The read is async, so first paint is held until it resolves. `src/app/_layout.tsx` already returns
`null` while auth `status === 'loading'`; the hydration gate joins that same condition rather than
adding a second one. Someone who chose Dark never sees a light flash.

The alternative — paint with the system value and switch on hydration — was rejected because the
flash is most visible to exactly the users who cared enough to change the setting.

## The control

**A custom `SegmentedControl` primitive** at `src/components/core/segmented-control.tsx`, built from
`PressableOpacity` + `AppText` + theme tokens, rendered inline on Profile beneath the Notifications
row.

**This is the one decision made without the user present, and it is reversible.** The alternative is
`@react-native-segmented-control/segmented-control`, which wraps the real `UISegmentedControl` —
genuinely more native, and what iOS Settings itself uses for Appearance. It was not chosen because:

- It is a native module, so it needs a rebuild, and this branch has already had one lockfile
  incident (`51e1219`, restoring a duplicated `react-native-screens`).
- ADR 0004 commits to a custom theme with no component library, and this codebase already
  hand-rolls comparable primitives — `toggle-switch.tsx` is exactly this shape.
- A themed primitive works in Expo Go and on web with no native dependency.

If the hand-rolled control looks wrong next to the platform, swapping in the native package is a
contained change behind the same props.

The control is inline rather than behind its own Appearance screen because the whole setting is one
control, and appearance is the one setting where seeing the result *is* the confirmation.

## Required corrections

These are not polish. Without them the switch is visibly broken:

1. **Five hardcoded `<StatusBar style="dark" />`** — `home/_layout.tsx`, `activity/_layout.tsx`,
   `profile/_layout.tsx`, `sign-up/_layout.tsx`, `forgot-password/_layout.tsx`. In dark mode these
   give dark status text on a dark background. Each follows the resolved theme.
2. **`src/app/_layout.tsx`** reads React Native's `useColorScheme` directly to pick react-navigation's
   `DarkTheme` / `DefaultTheme`. It must read the resolved scheme, or the navigation chrome stays on
   the system setting while the app switches.

## Out of scope, explicitly

- Hardcoded hex values in `themed-text.tsx`, `main-button.tsx`, `icon-button.tsx` and
  `animated-icon.tsx`. The `#ffffff` ones sit on primary buttons and read correctly in both themes;
  the blue in `themed-text.tsx` does not, but that component is unused by the screens this change
  touches. Belongs to the polish pass.
- Any screen-by-screen dark mode audit.
- A follow-up "Appearance" screen. If a second display setting ever arrives, the inline control
  moves behind a row then.

## Verification

`bun run typecheck`, `bun run lint` (must stay at exactly 2 pre-existing warnings), `bun run
spellcheck`. Beyond that this is a visual change and needs a device: set each of the three options,
confirm the app changes immediately, force-quit and relaunch, and confirm the choice survives with
no flash of the wrong theme.
