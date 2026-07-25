---
status: accepted
---

# Sheets use TrueSheet components, not Expo Router form-sheet routes

Bottom sheets are `@lodev09/react-native-true-sheet` components, colocated with whatever opens them and presented imperatively through a ref. Expo Router's built-in `presentation: 'formSheet'` is **not** used, despite shipping with the router this project already depends on.

This needs recording because the default assumption is the opposite: Expo Router has a perfectly good native sheet, `react-native-screens` is already installed, and adding a dependency to replace a built-in is normally the wrong instinct.

## Considered options

- **Expo Router `presentation: 'formSheet'`** — rejected, narrowly. It is genuinely native (`UISheetPresentationController` via `react-native-screens`), costs no dependency, and gives deep-linking for free since every sheet is a route. Its cost is that *every* sheet must be a route: a URL, a file, an entry in a stack. That's a good trade for destinations and a poor one for the contextual sheets that make up most of this app — a confirmation, a filter, a quick note field. Those belong to one component and should not be addressable.
- **`@gorhom/bottom-sheet`** — rejected outright. Reimplements sheet behaviour in JS/Reanimated rather than presenting the platform's own sheet. Against the native-feel goal in PRODUCT_BRIEF and against ADR 0004's reasoning.
- **TrueSheet** (chosen). Wraps the same native primitives as `formSheet` — `UISheetPresentationController` on iOS, `BottomSheetDialog` on Android — but exposes them as a component with an imperative `present()`/`dismiss()` ref. Sheets sit next to their owner, which is where the state they operate on already lives. Actively maintained, and every peer dependency it wants (`react-native-reanimated` ≥4, `react-native-worklets`, `@react-navigation/core` ≥7) was already present.

ADR 0004 rules out component *libraries* that supply the app's visual primitives. TrueSheet is not that — it is a host for presenting native platform UI, and the content inside every sheet is still this project's own `AppText` / `MainButton` / `Divider`. The `BaseSheet` wrapper is what keeps that boundary honest.

## Consequences

- **Deep linking has to be built, once.** A sheet has no URL, so a push notification cannot open one directly. Notifications route to the sheet's **host screen** with a param (`/activity?logId=…`); the screen presents the sheet from an effect after the record loads, then clears the param. This is the price of the decision, it is paid in one place, and every later notification type reuses it.
- **`BaseSheet` is the only place that imports `TrueSheet` as a value.** Everywhere else imports it as a type, for the ref. Same containment rule as the `Icon` allow-list in ADR 0008 — one file owns the primitive, so swapping or configuring it later is a single edit.
- **Colours must be resolved at render, not module scope.** `backgroundColor` is passed to native code, so a module-level constant produces a sheet that ignores dark mode while the JS content inside it adapts — a particularly confusing bug, since half the sheet themes correctly.
- **Adding a native dependency means a rebuild.** `ios/` is committed, so this is `npx expo install`, pod install, and a fresh dev client — not an OTA-compatible change.
- Android caps at 3 detents, so the shared `BaseSheet` default (`['auto', 0.6, 1]`) is already at the platform limit. Sheets needing finer positions must go iOS-only or rethink their layout.
