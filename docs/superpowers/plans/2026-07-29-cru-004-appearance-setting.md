# CRU-004 Appearance Setting — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-07-29-appearance-setting-design.md` — read it first.

**Branch:** stays on `feat/PAW-003-push-notifications` by explicit instruction from Dylan. Do not
create a branch. Do not open a PR.

Read `AGENTS.md` before writing code. It is the ruleset, and the Comments section was tightened
today — comment the *why*, never narrate a change, and do not add block comments to ordinary code.

## Task 1 — The store

Create `src/stores/theme-store.ts`.

- `ThemePreference = 'system' | 'light' | 'dark'` — export it from `src/types/core.ts` if that is
  where comparable shared types live; check before deciding.
- Follow the `State` / `Action` split shown in AGENTS.md. State: `preference` (default `'system'`)
  and `hasHydrated` (default `false`). Actions: `setPreference`, which writes to AsyncStorage and
  updates state, and `hydrate`, which reads the key once at startup and sets `hasHydrated` true.
- Key: `crumpet.themePreference`.
- A read failure sets `'system'` and still marks hydrated — never leave the app gated forever on a
  storage error.
- Validate the stored string against the three permitted values before trusting it. A corrupt or
  stale value falls back to `'system'`.

## Task 2 — The resolver

Rewrite `src/hooks/use-color-scheme.ts`.

It currently re-exports React Native's `useColorScheme`. It must now return `'light' | 'dark'`
resolved from the store: the system value when the preference is `'system'`, otherwise the
preference itself.

Keep the export name `useColorScheme` so every existing consumer is unchanged. `use-theme.ts`
already narrows `'unspecified'`; make sure that path still behaves.

Consume the store with a plain destructure, per AGENTS.md — not a per-field selector.

## Task 3 — Hydration gate

In `src/app/_layout.tsx`:

- Call the store's `hydrate` once on mount.
- Extend the existing `if (status === 'loading') return null;` in `AuthGate` so it also waits on
  `hasHydrated`. Join the existing condition; do not add a second early return.
- Change the `ThemeProvider` at line ~57 to pick `DarkTheme` / `DefaultTheme` from the resolved
  scheme (`@/hooks/use-color-scheme`), not React Native's `useColorScheme` imported at line 4.
  Remove that now-unused import if nothing else needs it.

## Task 4 — StatusBar

Five files hardcode `<StatusBar style="dark" />`:

- `src/app/(protected)/(tabs)/home/_layout.tsx`
- `src/app/(protected)/(tabs)/activity/_layout.tsx`
- `src/app/(protected)/(tabs)/profile/_layout.tsx`
- `src/app/(public)/(auth)/sign-up/_layout.tsx`
- `src/app/(public)/(auth)/forgot-password/_layout.tsx`

Each must follow the resolved theme. Prefer `style="auto"` if it correctly tracks the resolved
scheme rather than the OS one; if it tracks the OS, use `useTheme()`'s `isDark` and set
`style={isDark ? 'light' : 'dark'}` explicitly. Verify which is true before choosing — do not guess.

## Task 5 — The SegmentedControl primitive

Create `src/components/core/segmented-control.tsx`.

Build it from `PressableOpacity`, `AppText` and theme tokens. `toggle-switch.tsx` is the closest
existing primitive — match its prop shape and file structure.

- Generic over the option value; takes `options` (value + label), `value`, `onChange`, and an
  optional `label`.
- Themed via a module-level `makeStyles` factory + `useStyles`. No hardcoded colours.
- The selected segment uses `colors.backgroundSelected`; the track uses `colors.backgroundElement`.
- Accessible: each segment is a real pressable with an accessibility label and selected state.
- 44pt minimum tap target per segment.
- `hapticLight` from `@/lib/haptics` on selection, matching the app's existing feedback.

## Task 6 — The control on Profile

In `src/app/(protected)/(tabs)/profile/index.tsx`, render the control inline beneath the
Notifications row, above the Sign out button.

Labels are **Australian/British English**, sentence case: `System`, `Light`, `Dark`, under a
`Appearance` label. Copy says what it does — no marketing.

Wire it to the store with a plain destructure.

## Task 7 — Gates

- `bun run typecheck` — must be clean.
- `bun run lint` — must stay at **exactly 2** pre-existing warnings (`src/app/_layout.tsx:17`,
  `src/components/screens/auth/auth-footer-link.tsx:25`). A third is yours.
- `bun run spellcheck` — must be 0. It needs Node >= 22.18; if the shell resolves Node 20, run it as
  `PATH="$HOME/.volta/bin:$PATH" bun run spellcheck`.

Commit in logical commits using the repo's `<type>: <summary>` style, ending each message with the
`Co-Authored-By: Claude <noreply@anthropic.com>` trailer. Diff before every commit — something in
this repo has twice stripped comments from files after they were written.

## Do not

- Do not audit or fix dark mode appearance beyond the two corrections in Tasks 3 and 4. That is
  deliberately a separate pass.
- Do not add `@react-native-segmented-control/segmented-control` or any other native dependency.
- Do not touch the hardcoded hex values in `themed-text.tsx`, `main-button.tsx`, `icon-button.tsx`
  or `animated-icon.tsx`.
- Do not create a branch, open a PR, or push.
- Do not claim the feature works on a device. Nothing here has been run on one.
