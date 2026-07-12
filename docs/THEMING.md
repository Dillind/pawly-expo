# Theming

Pawly uses a small, in-repo theme — **no component library and no NativeWind/Tailwind** (see [ADR 0004](./adr/0004-custom-theme-no-component-library.md)). Everything lives in `src/constants/theme.ts` and is consumed through two hooks: `useTheme()` and `useThemedStyles()`.

## The theme object

`src/constants/theme.ts` exports the tokens:

- **`COLORS`** (aliased as `Colors`) — a `light` and `dark` palette with matching keys. `ThemeColor` is the union of those keys.
- **`Fonts`** — platform-selected font families (Inter on native; CSS variables on web).
- **`Spacing`**, plus `BottomTabInset` and `MaxContentWidth`.

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

## Getting colours: `useTheme()`

`useTheme()` (from `@/hooks/use-theme`) returns the **flat palette for the current colour scheme** — light or dark is resolved for you. Never hard-code colour strings.

```tsx
import { useTheme } from '@/hooks/use-theme';

const MyComponent = () => {
  const theme = useTheme();
  return <View style={{ backgroundColor: theme.background }} />;
};
```

## Styling: `useThemedStyles()`

Build a `StyleSheet` from the theme with `useThemedStyles`. It recreates styles when the scheme changes, and takes an optional dependency array for prop-driven values.

```tsx
import { useThemedStyles } from '@/hooks/use-themed-styles';

const styles = useThemedStyles(
  (colors) => ({
    container: {
      backgroundColor: colors.background,
      borderColor: colors.textSecondary
    }
  }),
  [] // extra deps, e.g. a colour prop
);
```

Use `Spacing` for sizing instead of magic numbers:

```tsx
import { Spacing } from '@/constants/theme';

// Spacing: half=2, one=4, two=8, three=16, four=24, five=32, six=64
<View style={{ padding: Spacing.three, gap: Spacing.two }} />;
```

For elevation, use the helpers in `@/lib/styles/shadows` (`createShadowSmall` | `Medium` | `Large`), which take the theme and handle iOS/Android:

```tsx
import { createShadowMedium } from '@/lib/styles/shadows';

const styles = useThemedStyles((colors) => ({
  card: { ...createShadowMedium(colors), backgroundColor: colors.backgroundElement }
}));
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

The app follows the system setting (`userInterfaceStyle: 'automatic'` in `app.config.ts`; scheme resolved via `use-color-scheme`). Because `useTheme()` returns the correct palette automatically, components generally don't branch on mode. If you truly need scheme-specific rendering, read the scheme from `@/hooks/use-color-scheme`.

## Web fonts (`global.css`)

`src/global.css` defines CSS font-family variables (`--font-display`, `--font-mono`, etc.) consumed by `Fonts.web`. It is imported by `theme.ts`. **It is not Tailwind and must not be removed** — web fonts depend on it.
