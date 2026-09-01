# Month popover and week strip

Research for the Tiimo-style Home header on `feat/CRU-091-home-rework`. Two things: a month
calendar popover hanging off the month label, and a week strip that can be scrolled to the
previous and next week.

Sources are the installed `@expo/ui@57.0.9` package source, the versioned Expo SDK 57 docs, the
React Native 0.86 docs, the FlashList docs, and the npm registry. Every factual claim below has a
link. Where I could not verify something I say so.

---

## Answer first

**The popover: use `@expo/ui`.** It already ships a real SwiftUI `Popover` with an arrow, and a
real SwiftUI `DatePicker` that can be styled `graphical` — which is the month grid in the
screenshot. Both are already installed. On iPhone the popover would normally adapt into a sheet;
Expo's own native code applies `.presentationCompactAdaptation(.popover)`, so it stays a popover
with its caret. Nothing new to install, no hand-rolled approximation, and it satisfies the
project's "prefer the platform's own component" rule better than anything else considered.

The catch is that a SwiftUI `DatePicker` is Apple's calendar, not ours. Weekday columns, the
selected-day circle, the month title with the chevron and the left/right arrows are all drawn by
the system, in the system's colours, with `MON..SUN` order coming from the device locale rather
than from us. If the design must match the mock pixel for pixel, that is a hand-drawn grid inside
the same `@expo/ui` `Popover`, which is still the right container.

**The week strip: keep what is there, and change how it pages.** `src/components/screens/home/week-strip.tsx`
already exists and already swipes between weeks with a fling gesture. It is not a list at all — it
redraws seven cells for whatever week the selected day sits in. That is the simplest correct thing
and it has no virtualisation problem to solve. If the strip must track the finger rather than jump
on a fling, the smallest upgrade is a horizontal paging `FlatList` (or `ScrollView`) over a fixed
window of weeks with `initialScrollIndex` in the middle. Do **not** reach for FlashList here: this
project does not have FlashList installed, uses `@legendapp/list` instead, and FlashList's docs do
not list `pagingEnabled` or `snapToInterval`.

Neither answer needs a new dependency.

---

## What is already in the codebase

Read on branch `feat/CRU-091-home-rework`.

| File | What it does |
|---|---|
| `src/components/screens/home/week-strip.tsx` | The week strip. Seven flex cells, Reanimated sliding underline, per-day Reminder dots, `Gesture.Fling` left/right to change week. Not virtualised. |
| `src/app/(protected)/(tabs)/home/index.tsx` | Owns `pickedDay` state, renders the header row (`formatWeekdayName` big, `formatMonthAndYear` small and uppercase) and the strip. |
| `src/lib/dates.ts` | `weekOf`, `shiftWeeks`, `weekdayInitial`, `dayOfMonth`, `formatMonthAndYear`, `todayInTimezone`. |
| `src/components/core/tray.tsx`, `src/components/bottom-sheets/base-sheet.tsx` | The sheet stack (TrueSheet). |
| `src/components/ui/action-popover.tsx` | The existing "popover", which is a hand-drawn glass bubble, not a native popover. |
| `src/components/core/main-legend-list.tsx` | The list wrapper. Wraps `@legendapp/list`, not FlashList. |

The header month label in `home/index.tsx` is a plain `AppText`. It has no chevron and is not
tappable. That is the piece the popover would attach to.

Two conventions that bear on the recommendation:

- **Sheets vs popovers.** `AGENTS.md` is firm that "sheet" means the native presentation, and a
  control anchored to what opened it is a *popover*. So this thing is correctly called a popover,
  and `ActionPopover` sets the precedent for one existing.
- **[ADR 0011](../adr/0011-liquid-glass-progressive-enhancement.md)** — glass is additive, always
  guarded by `hasGlass`, always with a complete opaque fallback. It also rejects `expo-blur` as a
  sub-iOS-26 imitation: *"this app prefers the platform's own thing or an honest plain one, not an
  imitation."* That line points straight at using the real popover rather than drawing one.

---

## Question 1 — the month popover

### What `@expo/ui` exposes in SDK 57

`package.json` pins `@expo/ui` at `~57.0.9`. The SwiftUI surface is listed on the
[SDK 57 UI docs page](https://docs.expo.dev/versions/v57.0.0/sdk/ui/) and the installed build
directory `node_modules/@expo/ui/build/swift-ui/` confirms it. Components relevant here:
`Host`, `Popover`, `Menu`, `ContextMenu`, `DatePicker`, `ScrollView`, `LazyHStack`,
`GlassEffectContainer`.

**There is no `DateTimePicker`.** There is a `DatePicker`. From
`node_modules/@expo/ui/build/swift-ui/DatePicker/index.d.ts`:

```ts
export type DatePickerComponent = 'date' | 'hourAndMinute';

export interface DatePickerProps extends CommonViewModifierProps {
  title?: string;
  selection?: Date;
  range?: DateRange;
  displayedComponents?: DatePickerComponent[];  // default ['date']
  onDateChange?: (date: Date) => void;
  children?: React.ReactNode;
}
```

**The variants live in a modifier, not a prop.** From
`node_modules/@expo/ui/build/swift-ui/modifiers/datePickerStyle.d.ts`:

```ts
export type DatePickerStyleType = 'automatic' | 'compact' | 'graphical' | 'wheel';
```

`graphical` is the month grid. This maps to SwiftUI's
[`datePickerStyle(_:)`](https://developer.apple.com/documentation/swiftui/view/datepickerstyle(_:)),
which the modifier's own doc comment links to.

Worth knowing before building it: the native implementation carries a workaround comment for
`graphical`. From `node_modules/@expo/ui/ios/DatePickerView.swift`:

> `.graphical` has some AutoLayout bug (it uses UICalendarView under the hood) It shrinks height
> when user taps a date. […] Current fix is to add a fixed min width of 320 when `.graphical`
> style is used.

It cites [expo/expo#47062](https://github.com/expo/expo/issues/47062). So a graphical picker is at
least 320pt wide, which is fine for a popover on a phone but is a real constraint.

### Anchored presentation with the caret, on iPhone

Yes. `@expo/ui` exposes it. From
`node_modules/@expo/ui/build/swift-ui/Popover/index.d.ts`:

```ts
export interface PopoverViewProps extends CommonViewModifierProps {
  isPresented?: boolean;
  onIsPresentedChange?: (isPresented: boolean) => void;
  attachmentAnchor?: 'leading' | 'trailing' | 'center' | 'top' | 'bottom';
  arrowEdge?: 'leading' | 'trailing' | 'top' | 'bottom' | 'none';  // default 'none'
}
// with Popover.Trigger and Popover.Content
```

`arrowEdge` is the caret. `'none'` does not mean "no arrow" — the type doc says it "results in the
system allowing any arrow edge", so the system picks. To point the caret **up** at the chevron,
the popover sits below the trigger, which is `arrowEdge: 'top'`.

The iPhone adaptation question is the important one, and it is settled in Expo's native code.
`node_modules/@expo/ui/ios/Popover/PopoverView.swift`:

```swift
.popover(
  isPresented: $isPresented,
  attachmentAnchor: props.attachmentAnchor?.anchor ?? .rect(.bounds),
  arrowEdge: props.arrowEdge?.edge
) {
  if #available(iOS 16.4, *) {
    popoverContent
      .presentationCompactAdaptation(.popover)
  } else {
    popoverContent
  }
}
```

That is the SwiftUI equivalent of the UIKit delegate returning `.none`. So:

- **iOS 16.4 and above:** a real popover on iPhone, with the caret.
- **Below iOS 16.4:** no `presentationCompactAdaptation`, so it adapts to a sheet. This is the
  documented SwiftUI default for a compact size class. Treat sub-16.4 as a fallback path, exactly
  the way ADR 0011 treats sub-iOS-26.

The Apple pages are the reference for the underlying behaviour —
[`presentationCompactAdaptation(_:)`](https://developer.apple.com/documentation/swiftui/view/presentationcompactadaptation(_:)),
[`popover(isPresented:attachmentAnchor:arrowEdge:content:)`](https://developer.apple.com/documentation/swiftui/view/popover(ispresented:attachmentanchor:arrowedge:content:)),
[HIG: Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers). **I could
not extract the text of those three pages** — Apple serves them as a JavaScript app and the fetch
returned only the page title. So I am not quoting Apple here. The behaviour above is taken from
Expo's own Swift source, which is primary and checkable, and the Apple links are for the reader.

`@expo/ui` also ships a `GlassEffectContainer`
(`node_modules/@expo/ui/build/swift-ui/GlassEffectContainer/index.d.ts`), so the popover's
material is available inside the same SwiftUI tree if wanted. A system popover already draws its
own blurred background, so this is probably not needed.

### expo-router's Link preview — wrong tool

`Link` does expose `Link.Preview`, `Link.Trigger` and `Link.Menu`, per the
[SDK 57 Link docs](https://docs.expo.dev/versions/v57.0.0/sdk/router/link/): `Link.Preview` is
"a component used to render and customize the link preview", `Link.Menu` "groups context menu
actions for a link", both iOS only, both raised by a **long press**.

It is the wrong tool for three reasons. The trigger is a long press, not a tap. The thing is a
navigation preview of a route, not a control. And a preview is dismissed by lifting or by picking
a menu action, so a user cannot sit inside it tapping day cells.

### `@expo/ui` Menu / ContextMenu — real UIMenu, wrong container

`Menu` renders SwiftUI's `Menu`, which on iOS is a `UIMenu`. From
`node_modules/@expo/ui/ios/Menu/MenuView.swift`, the body is literally
`Menu(label) { Children() }` with an optional `primaryAction`. `ContextMenu` exposes `Trigger`,
`Items` and `Preview`, and its doc comment says items "could be `Section`, `Divider`, `Button`,
`Toggle`, `Picker` or even `ContextMenu` itself"
(`node_modules/@expo/ui/build/swift-ui/ContextMenu/index.d.ts`).

**A `UIMenu` cannot hold a calendar grid.** Its content model is menu elements — actions,
submenus, and on iOS 14+ inline sections. There is no arbitrary-view element. The one escape
hatch is `ContextMenu.Preview`, which does render arbitrary content, but a preview is not
interactive and it appears above a menu on long press. So: real UIMenu, yes; calendar inside it,
no.

### The realistic alternatives, plainly

**`@expo/ui` `Popover` + `DatePicker` styled `graphical`.** Produces the look, produces the caret,
because it *is* the system's own popover and the system's own calendar. Costs nothing new. What
it does not give you is control over the grid: Apple draws the weekday header, the selected-day
circle, the month title and the arrows. Weekday order follows the device locale. You cannot put
Reminder dots on days inside it.

**`@expo/ui` `Popover` + a hand-drawn grid inside `Popover.Content`.** Same native container,
same caret, same iPhone adaptation — but the grid is ours, so it matches the mock and can carry
dots. The content inside `Popover.Content` must be SwiftUI views from `@expo/ui`
(`VStack`, `HStack`, `Text`, `Button`), or an `RNHostView` if React Native views have to go inside.
More code than the `DatePicker`, and worth checking on a device that nesting RN content inside a
SwiftUI popover behaves. **I have not verified `RNHostView` inside `Popover.Content` on a device.**

**`react-native-true-sheet`.** Already a dependency, already the project's sheet primitive. It
presents from the bottom edge. **It cannot produce the caret and cannot anchor to the chevron** —
a `UISheetPresentationController` is not a popover. It is the right answer only if the decision is
"a month picker is a sheet in this app", which contradicts the screenshot.

**Hand-rolled absolutely positioned view with `expo-blur` / `expo-glass-effect`.** Can reproduce
the look including a caret, since a caret is a small rotated square or an SVG triangle. This is
what `ActionPopover` already does. But it is an imitation, and ADR 0011 rejected `expo-blur`
specifically as one. It also has to solve dismiss-on-outside-tap, keyboard and safe-area edges,
and rotation, all of which a real popover gets for free. `expo-glass-effect` alone is not enough:
per ADR 0011 it needs iOS 26 and a full opaque fallback, so this route ships two looks.

**`react-native-ios-context-menu` (latest 3.2.1, published 2025-09-28) and
`@react-native-menu/menu` (latest 2.0.0, published 2025-09-10)** — both maintained, per the
[npm registry](https://registry.npmjs.org/). Both wrap UIKit menus. Same objection as
`@expo/ui`'s `Menu`: a menu is not a container for a calendar. `react-native-ios-context-menu`
does expose auxiliary preview views, but adopting a third-party native module to reach something
`@expo/ui` already ships is the wrong trade here. **I did not verify either against SDK 57 / RN
0.86 on a build.**

### Recommendation for the popover

Build it as **`@expo/ui` `Popover`, wrapped in a `Host`, anchored to a new tappable month button in
the Home header**, and start with `DatePicker` + `datePickerStyle('graphical')`.

Why this over the hand-rolled bubble:

- It is the platform's own component, which is the project's stated preference and the same
  reasoning as ADR 0010 (TrueSheet over an approximation) and ADR 0011 (no `expo-blur` imitation).
- The caret, the dismiss behaviour, the material and the compact adaptation all come free and stay
  correct across OS versions.
- Nothing new is installed.

The trade-offs to accept, and they are real:

- **The calendar is Apple's.** No theme tokens reach inside it. If the mock's exact grid is
  non-negotiable, swap the `DatePicker` for a hand-drawn grid inside the same `Popover.Content` —
  keep the native container either way.
- **iOS 16.4 is the floor** for popover-shaped presentation on iPhone. Below that it becomes a
  sheet. Decide deliberately whether that is acceptable or whether the trigger should present a
  `BaseSheet` below 16.4.
- **`graphical` is at least 320pt wide** and has the AutoLayout height bug Expo works around.
  Check the popover's size on a small device.
- **Follow ADR 0011's containment rule.** One component owns this — say
  `src/components/screens/home/month-popover.tsx` — and it branches internally on availability.
  Callers never choose between a popover and a sheet variant.
- **Verify on a device, not in Jest.** `AGENTS.md` is explicit that Jest renders mocks for native
  surfaces. This is exactly that case.

---

## Question 2 — the week strip

### What is installed matters more than the comparison

**This project does not have `@shopify/flash-list`.** `package.json` lists `@legendapp/list@^3.3.0`
and there is a wrapper at `src/components/core/main-legend-list.tsx`. For completeness: Expo SDK 57
does pin FlashList at **2.0.2**, per
[`bundledNativeModules.json` on the `sdk-57` branch](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json).
The latest published FlashList is 2.3.2 (2026-06-10), per the
[npm registry](https://registry.npmjs.org/@shopify/flash-list). Adding it just for a
seven-item-wide strip is not justified.

### FlatList vs FlashList for a week strip

A week strip is seven views per page and, at most, a few dozen weeks in the window. Virtualisation
buys nothing at that size. The comparison is therefore mostly about which one snaps cleanly.

FlashList v2 does support horizontal lists — the
[v2 changes page](https://shopify.github.io/flash-list/docs/v2-changes) says "Horizontal Lists are
much improved, and items can also resize within the lists", `estimatedItemSize` is gone ("No longer
used"), and "`maintainVisibleContentPosition` is available and now enabled by default". The
[props documentation](https://shopify.github.io/flash-list/docs/usage) lists `horizontal`,
`initialScrollIndex`, `onEndReached` and `maintainVisibleContentPosition`, and explicitly lists
`getItemLayout` as unsupported.

**`pagingEnabled` and `snapToInterval` are not in FlashList's documented props.** They are
`ScrollView` props and may well pass through to the underlying scroll view, but that is not
documented and **I did not verify it**. For a strip whose whole job is to snap, relying on an
undocumented passthrough is a poor foundation. `FlatList` documents both, because it forwards
`ScrollView` props directly.

So: **`FlatList` (or a plain `ScrollView`) over FlashList**, for a week strip, in this project.

### Virtualising an unbounded date range

Two real strategies.

**A large fixed window with the initial index in the middle.** Build, say, 209 weeks — two years
either side of today — and start at index 104. Pair `initialScrollIndex` with `getItemLayout`, both
documented on [`FlatList`](https://reactnative.dev/docs/0.86/flatlist). `getItemLayout` is what
makes `initialScrollIndex` land without measuring, and without it a jump to a far index can fail or
land wrong. This is by far the simpler option, and for a date strip a window of a few years is
genuinely enough — a user who scrolls past the edge is not a case worth engineering for.

**A sliding window that appends and prepends.** Correct for a truly unbounded range, and much
harder. The pitfalls:

- **`onEndReached` while prepending.** Prepending changes every index below the viewport, so
  content offset jumps unless something holds it. Worse, an `onEndReached` can fire during the
  re-layout that a prepend causes, which re-enters the loader. Guard the loader with a ref, not
  with state.
- **`maintainVisibleContentPosition` is the fix, and it is supported.** The
  [RN 0.86 ScrollView docs](https://reactnative.dev/docs/0.86/scrollview#maintainvisiblecontentposition)
  describe it: "the scroll view will adjust the scroll position so that the first child that is
  currently visible and at or beyond `minIndexForVisible` will not change position. This is useful
  for lists that are loading content in both directions". It takes `minIndexForVisible` and
  `autoscrollToTopThreshold`. It is documented on `ScrollView` and inherited by `FlatList`. On
  FlashList v2 it is on by default (link above).
- **Jitter from variable item widths.** Not an issue for a week strip if every week is exactly one
  page wide. It becomes one the moment an item's width depends on its content.

For this feature: **fixed window, middle index**. The sliding window is the wrong amount of
machinery for a calendar strip.

### Snapping

Three options, in increasing specificity, all documented on
[`ScrollView`](https://reactnative.dev/docs/0.86/scrollview):

- **`pagingEnabled`** — "the scroll view stops on multiples of the scroll view's size". Simplest,
  but it snaps to the *scroll view's own width*, so it is only right when one page equals the full
  scroll view width.
- **`snapToInterval`** — "causes the scroll view to stop at multiples of the value". Docs say it
  "Overrides less configurable `pagingEnabled`" and is "typically used in combination with
  `snapToAlignment` and `decelerationRate="fast"`".
- **`snapToOffsets`** — "causes the scroll view to stop at the defined offsets", for
  "variously sized children". Overrides both of the above.

**The screen-width-minus-padding case is exactly why `pagingEnabled` is wrong here.** If the strip
is inset by horizontal padding, each week is narrower than the scroll view, so `pagingEnabled`
snaps to the wrong multiples. Two correct shapes:

1. Let the `FlatList` span the full screen width, give it
   `contentContainerStyle={{ paddingHorizontal: P }}`, make each item `SCREEN_WIDTH - 2 * P` wide,
   and use `snapToInterval={SCREEN_WIDTH - 2 * P}` with `snapToAlignment="center"` and
   `decelerationRate="fast"`. This is the shape that also gives peeking neighbours if wanted.
2. Or keep the list itself inset to `SCREEN_WIDTH - 2 * P`, make items exactly that width, and
   `pagingEnabled` is then correct — because page width equals scroll view width again.

Get the width from `useSafeAreaFrame` or `Dimensions`, and recompute it on rotation. A hard-coded
width is the bug that only shows up on a different device.

### Keeping state in sync

There is already **one source of truth**: `pickedDay` in `home/index.tsx`, a `YYYY-MM-DD` string,
with a comment explaining why it is a string and not a `Date`. Keep that. Everything else derives:

- The strip's page = `weekOf(pickedDay)`.
- The header's month label = `formatMonthAndYear(pickedDay)`.
- The popover's selected date = `pickedDay`.
- The Reminder dot query already keys off `weekOf(day)`.

**Popover → strip.** Choosing a day in the month grid sets `pickedDay`. The strip must then move to
that day's week. With a list of weeks, compute the week index from the date and scroll to it.
Prefer **`scrollToOffset({ offset: index * PAGE_WIDTH })`** over `scrollToIndex` here: page width is
constant and known, so the offset is exact, and `scrollToIndex` on a virtualised list can throw
`scrollToIndex should be used in conjunction with getItemLayout` or fire `onScrollToIndexFailed`
when the target is not rendered ([FlatList docs](https://reactnative.dev/docs/0.86/flatlist)). If
`getItemLayout` is supplied, `scrollToIndex` is safe too — but the offset form has fewer ways to
go wrong.

**Strip → header.** Paging the strip must update the month label, and the label can change
*mid-page* (a week that spans the end of September). Decide which day of the visible week names the
month; the least surprising rule is "the month of the selected day", and the selected day moves
with the page. Drive it from `onMomentumScrollEnd`, not `onScroll` — updating React state on every
scroll frame is the jank.

**The animation pitfall to watch for.** A programmatic `scrollToOffset({ animated: true })` fires
`onMomentumScrollEnd` when it lands. If that handler writes `pickedDay` from the landed page, and
`pickedDay` is what caused the scroll, you get a loop or a fight. Guard it: keep a ref that says
"this scroll was programmatic", and have the momentum handler ignore one landing. The existing
`week-strip.tsx` has no such problem because it does not scroll at all — which is an argument for
leaving it alone.

### Existing date-strip libraries

I checked the obvious one. **`react-native-calendars`** is maintained — latest 1.1314.0, published
2026-01-29, per the [npm registry](https://registry.npmjs.org/react-native-calendars). It has a
`CalendarProvider` + `WeekCalendar` + `ExpandableCalendar` set that is close to both halves of this
request.

I am **not** recommending it, for reasons that are about this project rather than the library:

- ADR 0004 rules out component libraries; this one brings its own theming model and would sit
  awkwardly beside the theme tokens.
- The Reminder dots, the sliding underline and the past-day treatment already exist and are
  specific to Crumpet.
- It draws its own calendar, which is the same objection as the SwiftUI `DatePicker` but without
  the compensating benefit of being the platform's.

**I did not verify `react-native-calendars` against Expo SDK 57 / RN 0.86 on a build.** It is a
pure-JS library, so it probably works, but "probably" is not verification.

Other names in this space (`react-native-calendar-strip`, `react-native-week-view`) I did not check
against SDK 57 and cannot vouch for.

### Recommendation for the week strip

**Leave `week-strip.tsx` as it is unless the fling gesture is the actual complaint.** It already
does what was asked: seven chips, left and right to reach the previous and next seven days. It is
about a hundred lines, has no virtualisation surface, and its underline animation is already right.

**If the strip must follow the finger**, convert it to a horizontal `FlatList` with:

- a fixed window of weeks (two years either side is plenty), `initialScrollIndex` at the middle,
  `getItemLayout` supplied;
- `snapToInterval={PAGE_WIDTH}` + `snapToAlignment="center"` + `decelerationRate="fast"` if the
  list spans the screen and the padding is on the content container; `pagingEnabled` only if the
  list itself is inset so page width equals list width;
- `onMomentumScrollEnd` writing the new week, guarded against programmatic scrolls;
- `scrollToOffset` for the jump when the popover picks a day.

Keep the Reminder dots, the underline and the past-day colour exactly as they are — those are the
parts that make the strip Crumpet's rather than generic.

No new dependency either way.

---

## What I could not verify

- **Apple's own wording.** The HIG "Popovers" page,
  `presentationCompactAdaptation(_:)` and `popover(isPresented:...)` are all rendered by
  JavaScript, and fetching them returned only the page title. The iPhone-adaptation claim in this
  document rests on Expo's Swift source, not on a quote from Apple.
- **`RNHostView` (React Native content) nested inside `Popover.Content`** on a device. Untested.
- **Whether `pagingEnabled` / `snapToInterval` pass through FlashList v2** to its scroll view.
  Undocumented, unverified.
- **`react-native-calendars`, `react-native-ios-context-menu` and `@react-native-menu/menu`
  against SDK 57 / RN 0.86.** I checked that they are maintained; I did not build with them.
- **How the `graphical` `DatePicker` looks with this app's theme** on device, light and dark. It
  needs looking at before it is committed to.

---

## Sources

- [Expo SDK 57 — UI (`@expo/ui`)](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)
- [Expo SDK 57 — Link](https://docs.expo.dev/versions/v57.0.0/sdk/router/link/)
- [`bundledNativeModules.json`, `sdk-57` branch](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json)
- [expo/expo — `packages/expo-ui`](https://github.com/expo/expo/tree/main/packages/expo-ui)
- [expo/expo#47062 — graphical DatePicker AutoLayout bug](https://github.com/expo/expo/issues/47062)
- Installed source, treated as primary: `node_modules/@expo/ui/build/swift-ui/{Popover,DatePicker,Menu,ContextMenu,ScrollView}/index.d.ts`,
  `node_modules/@expo/ui/build/swift-ui/modifiers/{datePickerStyle,presentationModifiers,scrollPosition}.d.ts`,
  `node_modules/@expo/ui/ios/Popover/PopoverView.swift`, `node_modules/@expo/ui/ios/DatePickerView.swift`,
  `node_modules/@expo/ui/ios/Menu/MenuView.swift`
- [React Native 0.86 — ScrollView](https://reactnative.dev/docs/0.86/scrollview)
- [React Native 0.86 — FlatList](https://reactnative.dev/docs/0.86/flatlist)
- [FlashList — v2 changes](https://shopify.github.io/flash-list/docs/v2-changes)
- [FlashList — usage and props](https://shopify.github.io/flash-list/docs/usage)
- [SwiftUI — `datePickerStyle(_:)`](https://developer.apple.com/documentation/swiftui/view/datepickerstyle(_:))
- [SwiftUI — `presentationCompactAdaptation(_:)`](https://developer.apple.com/documentation/swiftui/view/presentationcompactadaptation(_:)) (text not retrievable)
- [SwiftUI — `popover(isPresented:attachmentAnchor:arrowEdge:content:)`](https://developer.apple.com/documentation/swiftui/view/popover(ispresented:attachmentanchor:arrowedge:content:)) (text not retrievable)
- [Apple HIG — Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers) (text not retrievable)
- npm registry: [`@shopify/flash-list`](https://registry.npmjs.org/@shopify/flash-list),
  [`react-native-calendars`](https://registry.npmjs.org/react-native-calendars),
  [`react-native-ios-context-menu`](https://registry.npmjs.org/react-native-ios-context-menu),
  [`@react-native-menu/menu`](https://registry.npmjs.org/@react-native-menu/menu)
- In-repo: [ADR 0011](../adr/0011-liquid-glass-progressive-enhancement.md), `AGENTS.md` (Sheets, Popovers)
