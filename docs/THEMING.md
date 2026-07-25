# Theming

Pawly uses a small, in-repo theme — **no component library and no NativeWind/Tailwind** (see [ADR 0004](./adr/0004-custom-theme-no-component-library.md)). Tokens live in `src/constants/theme.ts` and are consumed through `useTheme()` and `useStyles()`.

## The theme object

`src/constants/theme.ts` exports the tokens:

- **`COLORS`** (aliased as `Colors`) — a `light` and `dark` palette with matching keys. `ThemeColor` is the union of those keys.
- **`Fonts`** — platform-selected font families (Inter on native; CSS variables on web).
- **`Spacing`**, plus `BottomTabInset` and `MaxContentWidth`.
- **`AppTheme`** — the resolved shape returned by `useTheme()`: `{ colors, isDark, spacing }`.

Current colour tokens (keys are the `ThemeColor` union):

| Token | Light | Dark | Use for |
| ------------------- | --------- | --------- | ---------------------------- |
| `text` | `#000000` | `#ffffff` | Primary text |
| `textSecondary` | `#60646C` | `#B0B4BA` | Secondary/hint text, borders |
| `background` | `#ffffff` | `#000000` | Screen background |
| `backgroundElement` | `#F0F0F3` | `#212225` | Cards, elements |
| `backgroundSelected`| `#E0E1E6` | `#2E3135` | Selected/pressed surfaces |
| `red100` | `#CE3C39` | `#CE3C39` | Errors, destructive |

> The proposed brand palette in PRODUCT_BRIEF (teal/blue/indigo) is **not** in the theme yet. Reconcile in a design session before relying on it.

## Getting the theme: `useTheme()`

`useTheme()` returns the resolved `AppTheme` for the current colour scheme. Light/dark is handled for you — use `theme.colors` for palette values.

```tsx
import { useTheme } from '@/hooks/use-theme';

const MyComponent = () => {
  const theme = useTheme();

  return <View style={{ backgroundColor: theme.colors.background }} />;
};
```

For one-off colour access, destructure what you need:

```tsx
const { colors, isDark, spacing } = useTheme();
```

## Styling: `makeStyles` + `useStyles()`

Define styles at **module scope** with a `makeStyles` factory (normal `StyleSheet.create`), then memoise inside the component with `useStyles`. Styles recompute when the colour scheme changes.

```tsx
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const MyComponent = () => {
  const styles = useStyles(makeStyles);

  return <View style={styles.container} />;
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderColor: colors.textSecondary,
      padding: spacing.three
    }
  });
```

When styles depend on props, wrap the factory in `useCallback` so it stays a stable cache key:

```tsx
const MyComponent = ({ highlighted }: { highlighted: boolean }) => {
  const makeThemedStyles = useCallback(
    (theme: AppTheme) => makeStyles(theme, highlighted),
    [highlighted]
  );
  const styles = useStyles(makeThemedStyles);

  return <View style={styles.container} />;
};

const makeStyles = ({ colors, isDark }: AppTheme, highlighted: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: highlighted
        ? colors.backgroundSelected
        : isDark
          ? colors.backgroundElement
          : colors.background
    }
  });
```

`useStyles` is a React hook — call it **inside** a component, not at module scope.

> `useStyles` takes no `deps` argument: `makeStyles` **is** the cache key. An inline arrow is
> still correct, it just recomputes every render. `useThemedStyles()` has been removed.

Use `spacing` from the theme (or `Spacing` from `@/constants/theme`) instead of magic numbers:

```tsx
// spacing: half=2, one=4, two=8, three=16, four=24, five=32, six=64
const { spacing } = useTheme();
<View style={{ padding: spacing.three, gap: spacing.two }} />;
```

For elevation, use the helpers in `@/lib/styles/shadows` (`createShadowSmall` | `Medium` | `Large`), which take `theme.colors` and handle iOS/Android:

```tsx
import { createShadowMedium } from '@/lib/styles/shadows';

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    card: { ...createShadowMedium(colors), backgroundColor: colors.backgroundElement }
  });
```

## Text: use `AppText`

Prefer the `AppText` primitive (`@/components/core/app-text`) over raw `<Text>`. It applies the Inter font family, resolves colour from a `ThemeColor` key, and handles Android line-height/padding quirks.

```tsx
import AppText from '@/components/core/app-text';

<AppText variant="header" color="text">Screen title</AppText>
<AppText color="textSecondary" size={14}>Body copy</AppText>
```

- `variant`: `'header' | 'body'` (drives default size and weight)
- `color`: any `ThemeColor` key (default `text`)
- `fontWeight`: `'regular' | 'bold'`
- `size`, `align`, `numberOfLines`, `ellipsizeMode` as needed

## Buttons

Use `MainButton` (`@/components/core/main-button`) for primary actions — it supports `variant` (`primary` | `secondary` | `text`), `size`, `leftIcon`/`rightIcon`, `isLoading`, `isDisabled`, `hapticFeedback`, and either `onPress` or an Expo Router `href`.

## Light/dark mode

The app follows the system setting (`userInterfaceStyle: 'automatic'` in `app.config.ts`). `useTheme()` returns the correct palette via `theme.colors` and exposes `theme.isDark` when you need to branch. Most components should not need to — pass `isDark` into `makeStyles` only for cases where the same token isn't enough.

## Web fonts (`global.css`)

`src/global.css` defines CSS font-family variables (`--font-display`, `--font-mono`, etc.) consumed by `Fonts.web`. It is imported by `theme.ts`. **It is not Tailwind and must not be removed** — web fonts depend on it.
