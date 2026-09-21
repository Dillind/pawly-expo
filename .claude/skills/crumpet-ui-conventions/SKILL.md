---
name: crumpet-ui-conventions
description: Crumpet's own UI building rules — Option<T> and CONSTANT_CASE for selectable data, react-hook-form + Zod forms with isLabelIndicated and the DateTimePickerValidated time spinner, the Icon allow-list and IconButton, theme tokens and makeStyles, TrueSheet bottom sheets built on BaseSheet and SheetRow, Trays for sequenced edits, and ActionPopover. Invoke before writing or changing any UI in this repo — layout, styling, copy, navigation, screen composition, or a new component — alongside /frontend-design and /expo-native-ui. Route structure, state, services and data rules stay in AGENTS.md.
---

# Crumpet UI conventions

These rules were part of `AGENTS.md`. They moved here because they only apply when you build UI.
`AGENTS.md` still owns navigation, state, services, alerts and toasts, comments, and every safety
rule. Read this file in full before you write UI code.

### Constants and selectable options

**Module-level constant data is `CONSTANT_CASE`** — `SEX_OPTIONS`, `SIZE_STYLES`, `PHOTO_CAP`. This
is for fixed data only. Instances and derived values keep `camelCase` (`queryClient`, the `styles`
returned by `StyleSheet.create`, `isIOS`/`isAndroid`/`isWeb`).

**Anything selectable is `Option<T>`** (`src/types/core.ts`):

```ts
export type Option<T = string> = { value: T; label: string };
```

`value` is what gets stored, `label` is what the user reads. Keeping them apart is what stops a
stored enum being rendered raw, or a display string being written to a column. The lists live in
`src/constants/options.ts` and are typed to the domain — `Option<PetSex>[]`, not `string[]` — so
`DropdownPickerValidated` infers `T` and the call site needs no cast. Read a label back with
`optionLabel(SEX_OPTIONS, sex)` from `@/utils/options` rather than a second hand-kept map.

`DropdownPickerValidated` has an **`.ios.tsx` variant** backed by a real SwiftUI menu. Change both
or iOS silently keeps the old behaviour — the fallback file is not what runs on device.


### Forms

`react-hook-form` + **Zod** (`@hookform/resolvers`). Use the shared validated inputs in `src/components/core/` (e.g. `TextInputValidated`, `DatePickerValidated`) which read from `useFormContext` and render `FieldError`. No ad-hoc controlled inputs. Zod schemas are the single validation contract (also used by Edge Functions).

**A required field carries `isLabelIndicated`.** The prop draws the red asterisk through
`IndicatedText`, and it is off by default — so a field the schema rejects when empty looks
optional until the user tries to save. The schema is the source of truth, not the label text:

- **Required, so mark it:** anything the Zod field rejects for an empty or absent value — a
  `.min(1)` string, a `.regex()` on a time or date, an `z.email()`, an `z.enum()` whose form has no
  default for it.
- **Not required, so leave it bare:** a `.nullable()` or plain `z.string()` field, and any control
  the form always gives a value — `defaultValues: { sex: 'male' }` means the user cannot submit it
  empty, and an asterisk there is noise.

The four validated inputs take the prop: `TextInputValidated`, `DateTimePickerValidated`, and both
`DropdownPickerValidated` files. **`SegmentedControl` does not take it yet**, only because no caller
needs it — every one of them carries a value from `defaultValues`. It _can_ look unset: since
CRU-093 a control whose value matches no option paints no thumb. So a segmented control that can
start empty does need the indicator, and adding it means giving `IndicatedText` a `size` and
`fontWeight` first — the segmented label is 14/bold and `IndicatedText` is fixed at 16/regular.

When you add a field, set `isLabelIndicated` in the same edit as the schema line. Checking a form
afterwards means reading every field against every schema, which is how these get missed.

**Reading a field value: use `useWatch({ control, name })`, never `watch()`.** `watch()` subscribes
by mutating during render and returns a fresh value each call, which React Compiler (enabled via
`app.json` → `experiments.reactCompiler`) cannot memoise — it silently opts the component out of memoisation
and can serve stale reads. `useWatch` is a proper subscription hook and memoises correctly.

```tsx
// Do this
const petType = useWatch({ control, name: 'petType' });

// Not this
const petType = watch('petType');
```

#### Dates and times

**Any time a user sets or corrects is entered through `DateTimePickerValidated`** (`src/components/core/date-time-picker-validated.tsx`) with `mode="time"`, which renders the native wheel (`display="spinner"`, 216pt on iOS). Never a text field, never a masked `HH:mm` input, never a custom wheel.

```tsx
<DateTimePickerValidated
  mode="time"
  label="Time fed"
  selectedDate={value}
  setSelectedDate={onChange}
/>
```

The component already owns the storage/display split — it stores `HH:mm` and displays `h:mm A`, so call sites never format. `mode="date"` gets the inline calendar; that pairing is deliberate and lives in one place.

One live consequence:

- Inside a sheet this stacks a modal on a native sheet, which the Sheets rule below flags as a rough edge on iOS. The picker still wins — **verify on device**, and if the presentation misbehaves, render the same `mode="time"` spinner inline within the sheet. Reverting to a text input is not the fallback.


### Icons

Icons come from `lucide-react-native`, but **never import a Lucide icon directly in a screen or
component**, and never import from `lucide-react-native` anywhere except
`src/constants/icon-map.ts` — that allow-list is what keeps the bundle from silently growing.
See [ADR 0008](../../../docs/adr/0008-lucide-icon-library-typed-icon-map.md).

```tsx
import Icon from '@/components/core/icon';

<Icon name="calendar" size={16} />;
```

**Size every icon with an `IconSize` token** (`inline` 16, `control` 18, `action` 20, `header`
24, `feature` 28), chosen by the icon's role, never a number copied from nearby. Controls that sit
together share one size.

An icon-only tappable control is `IconButton`, which owns the 44pt target and a **required**
`accessibilityLabel`. A bar button is `Stack.Toolbar.Button`, never a React view, and never
`variant="glass"` inside a native header.

Full rules — every prop, the four `IconButton` variants and why `glass` behaves differently,
`HeaderIconButton`, and how to add a new icon — are in
**[docs/conventions/icons.md](../../../docs/conventions/icons.md)**.

### Styling & theming

Custom theme tokens — **no component library, no NativeWind/Tailwind** (see [ADR 0004](../../../docs/adr/0004-custom-theme-no-component-library.md)). Full guide in [docs/THEMING.md](../../../docs/THEMING.md). In short:

- Colours via `useTheme()` (from `@/hooks/use-theme`) — returns the active light/dark palette. Never hard-code colour strings.
- Styles via a module-level `makeStyles` factory + `useStyles(makeStyles)` — see Theming above. `useStyles` takes no `deps`: the factory itself is the cache key, so wrap it in `useCallback` when it closes over props.
- Text via the `AppText` primitive; spacing via `Spacing` from `@/constants/theme`.
- `global.css` exists **only** for web font CSS variables — it is not Tailwind; do not delete it.


### Sheets

Bottom sheets are the default way to present secondary content — confirmations, quick forms, detail views. They use **`@lodev09/react-native-true-sheet`**, which wraps the real native sheet on each platform (`UISheetPresentationController` on iOS, `BottomSheetDialog` on Android). See [ADR 0010](../../../docs/adr/0010-truesheet-over-expo-router-form-sheets.md) for why this over Expo Router's built-in `formSheet`.

**Sheets are components, not routes.** A sheet lives next to the thing that opens it and is presented imperatively through a ref.

```tsx
const logSheetRef = useRef<TrueSheet | null>(null);

<MainButton text="Log a feed" onPress={() => void logSheetRef.current?.present()} />
<LogFeedSheet sheetRef={logSheetRef} />   // sibling, not a child
```

Rules:

- **Always build on `BaseSheet`** (`src/components/bottom-sheets/base-sheet.tsx`). The only value import of `TrueSheet` is inside `base-sheet.tsx` — everywhere else import it as a **type** only, for the ref (`import type { TrueSheet } from '@lodev09/react-native-true-sheet'`). Same reasoning as the `Icon` allow-list: one place owns the primitive.
- **Theme at render.** `backgroundColor` is a native prop, so read it from `useTheme()` inside the component. Never capture colours at module scope — that silently breaks dark mode, since the sheet is drawn natively.
- **Hooks never take a sheet ref.** A hook does the work and returns state; the call site dismisses. `useLogout()` returns `{ logout, isLoading }` and knows nothing about sheets — keep it that way.
- **`detents`:** maximum of 3, sorted smallest to largest. Use `['auto']` for content-sized confirmations, `['auto', 0.6, 1]` (the `BaseSheet` default) for anything scrollable.
- **Never hand-roll a header or a row.** `BaseSheet`'s `title` draws the header — heading, close button, divider — and `SheetRow` draws every row. A sheet that builds its own gets a different size, a missing close button, or a row with no fill, which is exactly the drift these two exist to stop. `photo-source-sheet.tsx` is the reference:

  ```tsx
  <BaseSheet sheetRef={sheetRef} title="Add a photo" detents={['auto']}>
    <View style={styles.rows}>
      <SheetRow icon="camera" label="Take Photo" onPress={takePhoto} />
      <SheetRow icon="trash" label="Delete post" isDestructive onPress={confirmDelete} />
      <SheetRow label={pet.name} leading={<PetAvatar … />} isSelected isCheckbox onPress={toggle} />
    </View>
  </BaseSheet>
  ```

  Rows sit in a `View` with `gap: spacing.two`. Omit `title` and there is no header — right for an action sheet raised from a ⋯ menu, which needs no restating. `SheetRow` fills with `backgroundSheetRow`; the sheet behind it is `backgroundSheet`. Those two tokens are the only backgrounds a sheet may use.

- **Deep links reach sheets via their host screen**, because a sheet has no URL. Route to the screen with a param (`/activity?logId=…`), present from an effect once the data has loaded, then clear the param so back-navigation behaves. This is how notification taps open a specific record.
- Prefer an **inline** picker inside a sheet over `react-native-modal-datetime-picker` — stacking a modal on top of a native sheet is a rough edge on iOS. This is about _presentation_, not about the control: a time input is always the `mode="time"` spinner (see Dates and times above), inline if the modal misbehaves.

### Trays

A **Tray** is the standard presentation for a sequenced edit — several small steps in one flow, like
editing the feeding schedule. It's built on `Tray` (`src/components/core/tray.tsx`), which is one
`BaseSheet` whose content swaps per step and whose height animates to match. See
[ADR 0014](../../../docs/adr/0014-tray-is-one-sheet-with-swapping-content.md) for why it's one sheet and not
one sheet per step.

- **Never nest sheets for a multi-step flow.** A tray is the answer whenever a flow would otherwise
  need to present a second sheet from inside the first.
- **One concept per step.** Each `TrayStep` should ask for or show one thing. If a step needs its own
  scroll or its own loading state, it's probably two steps.

### Popovers (not sheets)

**"Sheet" means the native presentation described above — nothing else.** A control that is drawn in-app and anchored to whatever opened it is a **popover**, and it must not be named, filed, or described as a sheet. `ActionPopover` (`src/components/ui/action-popover.tsx`) is the one that exists: a floating glass menu with a `plus` trigger, secondary `ActionPopoverItem` rows, and a single emphasised `primaryAction`.

- **The trigger is owned by the popover, not placed separately.** Both surfaces live inside one `GlassContainer` so the material fuses as the bubble grows out of the button. Splitting them breaks the effect.
- **The fuse depends on the laid-out gap, not just `GlassContainer spacing`.** Measured on iOS 26: at an 8pt gap the surfaces grow a connecting neck, at 16pt they stay separate — with the same `spacing` either way. Changing the container's `gap` means re-checking on a device.
- **`primaryAction` is a separate prop from `actions`** so "there is exactly one primary" is enforced by the type rather than by convention.
- **Present sheets after the popover has closed, not alongside.** They are different presentation systems; a native sheet raised while the overlay is still up gets swallowed by iOS.
- **Vertical placement is a fixed offset** (`BottomTabInset`), because expo-router's native tabs expose no way to read the tab bar's height — `useBottomTabBarHeight` throws outside a JS tab navigator. This is why `minimizeBehavior` is off in `app-tabs.tsx`: a bar that changes height would leave the popover visibly detached.

