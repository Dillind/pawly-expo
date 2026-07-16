# Custom theme tokens + Expo UI; no component library, no NativeWind

Styling is done with a small in-repo theme (`src/constants/theme.ts` — `COLORS`, `Fonts`, `Spacing`) consumed via `useTheme()` and `useStyles(makeStyles)`, alongside native components from `@expo/ui` and `expo-router` native tabs. We deliberately do **not** use a component library (e.g. React Native Paper) and do **not** use NativeWind/Tailwind for styling.

## Why this is worth recording

A reader coming from other Expo/React Native projects will reasonably expect React Native Paper or NativeWind and may try to add one. They shouldn't.

- **No React Native Paper / Material Design.** The design goal is a bespoke, native-iOS feel (Luna-app reference), not Material. `useTheme<AppTheme>()` from Paper is **not** the pattern here — use the local `useTheme()` hook.
- **No NativeWind/Tailwind.** `className` styling is not wired up. `global.css` exists **only** to define web font-family CSS variables consumed by `Fonts.web`; it is not Tailwind and must not be deleted (web fonts depend on it). The `expo-tailwind-setup` skill on disk is not in use.

## Consequences

- New UI uses module-level `makeStyles` + `useStyles()` (or inline styles with `useTheme().colors`), and shared primitives in `src/components/core/` (`AppText`, `MainButton`, etc.).
- If a Tailwind/NativeWind adoption is ever reconsidered, supersede this ADR rather than adding it ad hoc.
