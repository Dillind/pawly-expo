# Icons

Extracted from `AGENTS.md` so it loads only when you touch an icon. The rule
that stays always-loaded is the one-line version in `AGENTS.md`.

Icons come from `lucide-react-native` (backed by `react-native-svg`), but **never import a Lucide icon directly in a screen or component.** Always go through the shared `Icon` primitive at `src/components/core/icon.tsx`, which reads from the explicit allow-list in `src/constants/icon-map.ts`:

```tsx
import Icon from '@/components/core/icon';

<Icon name="calendar" size={16} />
<Icon name="camera" size={24} color="textSecondary" />
```

- **`name`** — required, typed as `IconName` (`keyof typeof iconMap`). Only icons registered in the map are selectable — this is deliberate, not a limitation: it keeps every icon the bundler ever sees an explicit, reviewable choice instead of the whole Lucide set being reachable.
- **`size`** — defaults to `16`.
- **`color`** — a `ThemeColor` key (`'text'`, `'textSecondary'`, etc., same set `AppText` uses), defaults to `'text'`.
- **`strokeWidth`** — optional passthrough; omit to use Lucide's own default (`2`).
- `Icon` is decorative by default (hidden from the accessibility tree) — it does not accept an `accessibilityLabel`. Icon-only tappable controls must use `IconButton` (`src/components/core/icon-button.tsx`), which owns the 44pt tap target and takes a **required** `accessibilityLabel`; don't bolt accessibility props onto `Icon` itself.

```tsx
<IconButton name="plus" accessibilityLabel="Log a feed" size={28} onPress={onLogPress} />
```

Unlike `MainButton`, it never stretches to fill its parent — it is a fixed circular target (`alignSelf: 'center'`). Variants are `primary` / `secondary` / `ghost` / `glass`; the first two draw the glyph in `onPrimary`, `ghost` in `text`, and `glass` in `primary` (white on clear glass is invisible over a light background).

`glass` is the one variant that does not use `PressableOpacity`: it renders a `GlassView` with `isInteractive`, so the material itself provides the press response. Layering the usual opacity fade on top would fight it — see [ADR 0011](../adr/0011-liquid-glass-progressive-enhancement.md), which also requires the `hasGlass` fallback the variant already carries — below iOS 26 it drops back to the opaque `PressableOpacity` path, because there is no material to deform.

**A bar button is `Stack.Toolbar.Button`, not a React view.** SDK 57 renders a real
`UIBarButtonItem` from an SF Symbol, so it matches the back button by construction:

```tsx
<Stack.Toolbar placement="right">
  <Stack.Toolbar.Button icon="plus" accessibilityLabel="Share a photo" onPress={openComposer} />
</Stack.Toolbar>
```

`HeaderIconButton` below is the older path, kept for a header that is not a `Stack.Screen` child:

```tsx
headerRight: () => (
  <HeaderIconButton name="ellipsis" accessibilityLabel="Manage this post" onPress={openMenu} />
);
```

**Pass nothing but `name`, `accessibilityLabel` and `onPress`.** Its size, stroke and 36×40 box were
measured against the native back button on a simulator, so overriding `size` is what makes a header
button look almost-but-not-quite right next to the back chevron.

**Never `variant="glass"` in a native header.** On iOS 26 the bar draws its own glass circle behind
a bar button item; a `GlassView` inside that stacks two materials and reads visibly heavier than the
back button beside it. `HeaderIconButton` uses `ghost` precisely so the system provides the only
material. `glass` is for a control floating over content — the popover trigger, the Home bell — where
nothing else is drawing the circle.

**Adding a new icon:**

1. Check the icon exists at [lucide.dev/icons](https://lucide.dev/icons).
2. Add one line to `src/constants/icon-map.ts`: a semantic key (not necessarily Lucide's own export name — e.g. `caretDown` maps to Lucide's `ChevronDown`, matching this codebase's existing vocabulary) mapped to the Lucide component.
3. Use `<Icon name="yourNewKey" />` at the call site.

Never import from `lucide-react-native` anywhere except `icon-map.ts` — that's what keeps the bundle from silently growing as icons get added. See [ADR 0008](../adr/0008-lucide-icon-library-typed-icon-map.md) for why Phosphor was replaced.
