# Custom theme tokens + custom RN primitives; no component library, no NativeWind, no @expo/ui

Styling is done with a small in-repo theme (`src/constants/theme.ts` — `COLORS`, `Fonts`, `Spacing`) consumed via `useTheme()` and `useStyles(makeStyles)`, alongside hand-rolled React Native components in `src/components/core/` and expo-router native tabs. We deliberately do **not** use a component library (e.g. React Native Paper), do **not** use NativeWind/Tailwind for styling, and do **not** use `@expo/ui`.

## Why this is worth recording

A reader coming from other Expo/React Native projects will reasonably expect React Native Paper, NativeWind, or `@expo/ui` and may try to add one. They shouldn't.

- **No React Native Paper / Material Design.** The design goal is a bespoke, native-iOS feel (Luna-app reference), not Material. `useTheme<AppTheme>()` from Paper is **not** the pattern here — use the local `useTheme()` hook.
- **No NativeWind/Tailwind.** `className` styling is not wired up. `global.css` exists **only** to define web font-family CSS variables consumed by `Fonts.web`; it is not Tailwind and must not be deleted (web fonts depend on it). The `expo-tailwind-setup` skill on disk is not in use.
- **No `@expo/ui`.** The package was trialled in SDK 57 but removed. It ties UI behaviour tightly to SDK patch versions, the Swift-UI/Jetpack-Compose bridge adds native build complexity, and our custom primitives already give us full control over appearance and accessibility. Do not re-add it.

## Consequences

- New UI uses module-level `makeStyles` + `useStyles()` (or inline styles with `useTheme().colors`), and shared primitives in `src/components/core/` (`AppText`, `MainButton`, `TextInputValidated`, `ToggleSwitch`, etc.).
- If a Tailwind/NativeWind adoption is ever reconsidered, supersede this ADR rather than adding it ad hoc.
- If `@expo/ui` adoption is reconsidered (e.g. a future SDK where the API is stable), supersede this ADR and re-evaluate the build complexity trade-off.
