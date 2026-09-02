# Choosing an emoji: pickers, data and rendering on Expo SDK 57

Research dated 2026-09-02. The question is how to build a "Choose an emoji" sheet — a search field
over a scrollable category grid, like the iOS emoji keyboard — inside this app.

Every claim is cited. Where I could not verify something, I say so.

Versions confirmed from `package.json` before anything below was concluded: `expo ~57.0.11`,
`react-native 0.86.2`, `react 19.2.3`, `@expo/ui ~57.0.9`,
`@lodev09/react-native-true-sheet ^3.11.9`, `@legendapp/list ^3.3.0`. The iOS deployment target is
in `ios/Podfile` line 25: `platform :ios, podfile_properties['ios.deploymentTarget'] || '16.4'`.
That number turns out to decide most of section 5.

## The short version

There is no native emoji picker to borrow. Apple does not ship one as public API on iOS, and
`@expo/ui` does not wrap one. Every option is a hand-built grid, either ours or a library's.

The maintained library worth naming is **rn-emoji-keyboard**, and it is pure JavaScript — no native
code, no dev-client requirement. But it was last published **2024-05-09**, its bundled dataset is
frozen at **Emoji 15.0 (2022)**, and it has an open bug about scheduling `setState` from a render
body, which is exactly the pattern React Compiler is enabled for in this app.

Against that, a curated list of ~200 emoji as a plain TypeScript constant costs **9.6 KB** of
source. That is the recommendation.

---

## 1. Maintained React Native emoji-picker libraries

All figures below come from the npm registry metadata endpoint
(`https://registry.npmjs.org/<pkg>`) and the downloads API
(`https://api.npmjs.org/downloads/point/last-week/<pkg>`), read on 2026-09-02.

| Package | Latest | Published | Downloads/wk | Native code | Licence |
|---|---|---|---|---|---|
| [`rn-emoji-keyboard`](https://www.npmjs.com/package/rn-emoji-keyboard) | 1.7.0 | 2024-05-09 | 95,780 | none | MIT |
| [`@hiraku-ai/react-native-emoji-picker`](https://www.npmjs.com/package/@hiraku-ai/react-native-emoji-picker) | 1.2.4 | 2026-03-04 | 3,437 | none | Apache-2.0 |
| [`rn-expo-emoji-picker`](https://www.npmjs.com/package/rn-expo-emoji-picker) | 0.1.0 | 2026-07-08 | 1,142 | optional | MIT |
| [`react-native-emoji-selector`](https://www.npmjs.com/package/react-native-emoji-selector) | 0.2.0 | 2020-12-04 | 5,456 | none | MIT |
| [`react-native-emoji-keyboard`](https://www.npmjs.com/package/react-native-emoji-keyboard) | 1.1.1 | 2017-10-09 | — | yes | MIT |
| [`emoji-picker-react`](https://www.npmjs.com/package/emoji-picker-react) | 4.19.4 | 2026-09-01 | 1,462,167 | n/a — web only | MIT |

### rn-emoji-keyboard — the incumbent

Maintained by [TheWidlarzGroup](https://github.com/TheWidlarzGroup/rn-emoji-keyboard). 402 stars,
41 open issues, last push to `master` **2024-05-09T15:51:57Z**
([GitHub API](https://api.github.com/repos/TheWidlarzGroup/rn-emoji-keyboard)).

**No native code.** I downloaded and unpacked the 1.7.0 tarball. Its `package.json` `files` array
lists `android`, `ios`, `cpp` and `*.podspec`, but none of those directories exist in the published
tarball — it contains only `src/`, `lib/`, `README.md`, `LICENSE`. Its `peerDependencies` are
`{"react": "*", "react-native": "*"}` and it has zero runtime `dependencies`. So it runs in Expo Go
and needs no config plugin and no rebuild.

**New Architecture status: not declared, but the question barely applies.** There is no native
module, so there is no TurboModule or Fabric component to migrate. The `react-native.config.js` /
codegen surface a New-Arch audit looks for is absent. Its `devDependencies` pin
`react-native 0.71.8` and `react 18.2.0`, so it has never been built or tested against RN 0.86 or
React 19 by its own CI. I could not find any statement in the repo or on
[docs.thewidlarzgroup.com/rn-emoji-keyboard](https://docs.thewidlarzgroup.com/rn-emoji-keyboard/docs/documentation/start)
claiming New Architecture support. Treat it as "should work, unverified by the maintainer".

**The data is stale.** The package bakes in `src/assets/emojis.json`, 222.5 KB, generated from
`unicode-emoji-json@0.4.0` (its `devDependencies` pin that exact version). `unicode-emoji-json`
0.4.0 is the [Emoji Version 15.0 release](https://github.com/muan/unicode-emoji-json/releases),
published 2022-10-16. Three emoji versions have shipped since. Open issue
[#203 "chore: update unicode emoji json package version"](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/203)
(2025-07-14) and [#200 "Emoji update request"](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/200)
(2025-04-30) both ask for this and are still open.

**Open issues that matter for SDK 57.** None make it *unusable*, but two are relevant here:

- [#209 EmojiCategory schedules setState from the render body](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/209)
  (2026-08-03). `EmojiCategory` calls `InteractionManager.runAfterInteractions(() => setMaxIndex(...))`
  from its render body. The horizontal `FlatList` in `EmojiStaticKeyboard` renders three category
  pages around the active index, React discards some before commit, and each discarded render still
  leaves a queued task that fires against a fiber that never mounted. It logs a warning on every
  open. This app has React Compiler on (`app.json` → `experiments.reactCompiler`), and a side effect
  in a render body is precisely what the compiler assumes does not exist.
- [#207 SafeAreaView overflow — emoji picker won't get contained](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/207)
  (2026-04-16) and [#181 Keyboard overlay: doesn't lift the emoji keyboard when the keyboard is
  open](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/181). Both are about
  containment, which is the case we would hit — mounting the static keyboard inside a `BaseSheet`
  rather than using the library's own modal.

There is also [#201](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/201), an incorrect
TypeScript definition for `enableSearchBar` in 1.7.0, open since 2025-06.

### rn-expo-emoji-picker — new, promising, one version old

[JassiSingh08/rn-expo-emoji-picker](https://github.com/JassiSingh08/rn-expo-emoji-picker). Its
README states plainly: *"This library requires the React Native New Architecture"* and *"100%
JavaScript core — zero required native modules, works in Expo Go (SDK 53/54) and any dev build"*,
with an optional Expo Modules native row renderer behind a `/native` subpath import.

`peerDependencies` are `@legendapp/list >=3.0.0`, `@shopify/flash-list >=2.0.0`,
`expo-modules-core *`, `react >=19.0.0`, `react-native >=0.79.0`. We already have
`@legendapp/list ^3.3.0`, so the engine requirement is met.

The problem is maturity: **one published version, 0.1.0, on 2026-07-08, 1,142 downloads a week**,
and the README targets Expo SDK 53/54 — it says nothing about 57. It is the technically best-shaped
option and the riskiest to depend on.

### @hiraku-ai/react-native-emoji-picker

Published 2026-03-04, 3,437 downloads/week, Apache-2.0,
[hirakudotai/react-native-emoji-picker](https://github.com/hirakudotai/react-native-emoji-picker).
No runtime dependencies; `peerDependencies` are `react >=16`, `react-native >=0.60`,
`@react-native-async-storage/async-storage >=1.0.0`, `react-native-svg >=12.0.0`. We have both of
those peers already. Pure JS, so no dev client needed. It is too young and too little used for me to
recommend it, and the `react-native >=0.60` floor means it makes no claim about the New
Architecture.

### Dead or wrong-platform

- **`react-native-emoji-keyboard`** (brendan-rius) — last published **2017-10-09**, peer-pinned to
  `react-native 0.45.1`. Implemented natively. Dead.
- **`react-native-emoji-selector`** — last published 2020-12-04, depends on `emoji-datasource`.
  Unmaintained for six years.
- **`emoji-picker-react`** — 1.46M downloads a week, but it is a **DOM** library, not React Native.
  Its own README troubleshooting says *"This package relies on the `window` object and must be
  rendered on the client."* Not usable here. Its 40.8 MB unpacked size is a further hint about what
  it is.
- **`emoji-mart`** / **`@emoji-mart/react`** — same story, web only.

### The dev-client question, answered once

**None of the live candidates need a dev client.** `rn-emoji-keyboard`,
`@hiraku-ai/react-native-emoji-picker` and the default entry point of `rn-expo-emoji-picker` are
JavaScript only. This project builds a dev client anyway (`expo-dev-client ~57.0.10`, `ios/`
directory committed), so this is not a deciding factor either way.

---

## 2. Native surfaces

### @expo/ui exposes no emoji control

I listed the build output of the installed `@expo/ui@57.0.9` in `node_modules`.

SwiftUI components (`build/swift-ui/`): `AccessoryWidgetBackground`, `Alert`, `BottomSheet`,
`Button`, `Chart`, `ColorPicker`, `ConfirmationDialog`, `ContentUnavailableView`, `ContextMenu`,
`ControlGroup`, `DatePicker`, `DisclosureGroup`, `Divider`, `Form`, `Gauge`,
`GlassEffectContainer`, `Grid`, `Group`, `HStack`, `Host`, `Image`, `Label`, `LabeledContent`,
`LazyHStack`, `LazyVStack`, `Link`, `List`, `Mask`, `Menu`, `Overlay`, `Picker`, `Popover`,
`ProgressView`, `ScrollView`, `Section`, `SecureField`, `ShareLink`, `Shapes`, `Slider`, `Spacer`,
`Stepper`, `SwipeActions`, `SyncToggle`, `TabView`, `Text`, `TextField`, `Toggle`, `VStack`,
`ZStack`, plus `modifiers`.

Universal components (`build/universal/`): `BottomSheet`, `Button`, `Checkbox`, `Collapsible`,
`Column`, `FieldGroup`, `Host`, `Icon`, `List`, `ListItem`, `Picker`, `Row`, `ScrollView`, `Slider`,
`Spacer`, `Switch`, `Text`, `TextInput`.

A case-insensitive grep for "emoji" across `@expo/ui/build` and `@expo/ui/ios` returns nothing.
There is a `ColorPicker` — which wraps SwiftUI's `ColorPicker`, itself a wrapper over a real system
picker — and no emoji equivalent, because there is no system emoji picker to wrap. This matches the
[expo-ui skill's component list](https://docs.expo.dev/versions/v57.0.0/sdk/ui/).

### Apple ships no public emoji picker on iOS

Stated plainly: **there is no public iOS API to present the system emoji picker.** Three
independent checks:

1. **`UIKeyboardType` has no emoji case.** From the
   [Apple documentation JSON for `UIKeyboardType`](https://developer.apple.com/documentation/uikit/uikeyboardtype),
   the complete constant list is: `default`, `asciiCapable`, `numbersAndPunctuation`, `URL`,
   `numberPad`, `phonePad`, `namePhonePad`, `emailAddress`, `decimalPad`, `twitter`, `webSearch`,
   `asciiCapableNumberPad`, `alphabet`. Nothing emoji-shaped.
2. **`UITextInputMode` is read-only.** Its
   [documentation](https://developer.apple.com/documentation/uikit/uitextinputmode) exposes exactly
   one class property for reading state (`activeInputModes`), one instance property
   (`primaryLanguage`), and one notification (`currentInputModeDidChangeNotification`). There is no
   setter and no initialiser that takes a mode identifier. An app can observe which keyboard the
   user is on; it cannot choose one.
3. **No emoji symbol in the SwiftUI or UIKit framework indexes.** I fetched the framework index JSON
   for both `swiftui` and `uikit` from `developer.apple.com/tutorials/data/documentation/` and
   searched every reference title and identifier for "emoji". Zero hits in either.

The nearest thing Apple has is
[`NSApplication.orderFrontCharacterPalette(_:)`](https://developer.apple.com/documentation/appkit/nsapplication/1428455-orderfrontcharacterpalette),
which opens the character/emoji palette — but it is **AppKit**, so macOS only. There is no iOS
counterpart, because on iOS the emoji picker is part of the software keyboard rather than a
free-standing panel.

I found no evidence of a new SwiftUI emoji control in iOS 26. Absence of evidence is weaker than the
positive checks above, so take points 1–3 as the load-bearing ones: even if some new control existed,
`@expo/ui@57.0.9` does not wrap it, so it would need a custom Expo module either way.

---

## 3. The system-keyboard approach

The idea: render a `TextInput` limited to one character, and let the user tap the 🙂/globe key on the
system keyboard to switch to emoji.

**It still works, and a developer still cannot force it.** Section 2 is the proof: `UIKeyboardType`
has no emoji case, and `UITextInputMode` has no setter. React Native's `TextInput` `keyboardType`
prop maps onto that same `UIKeyboardType` enum, so it inherits the limitation exactly
([RN TextInput docs](https://reactnative.dev/docs/textinput#keyboardtype)). Nothing in the current
iOS SDK changes this.

What the APIs do allow is **reading**: `UITextInputMode.activeInputModes` lets native code check
whether the user has the Emoji keyboard enabled at all. React Native exposes no binding for it, so
using it would mean a small native module — and it would only tell you the approach is unavailable,
not fix it.

**What it costs the user, counted in taps:**

1. Tap the field. Keyboard opens on the last-used mode, usually letters.
2. Tap the 🙂 or globe key to switch to emoji — **1 tap, and only if that key is there.** If the user
   has more than one language keyboard installed, the globe key cycles rather than jumping to emoji,
   so it can be several taps or a long-press-and-drag.
3. Scroll or search within Apple's own picker.
4. Tap the emoji.
5. Dismiss the keyboard.

So the best case is one extra tap over a custom grid, and the worst case is a user who has disabled
the emoji keyboard and simply cannot complete the flow with no way for us to detect or explain it.
There is also no control over what they type: nothing stops a letter, and "one character" is a lie
once ZWJ sequences are involved (see section 5) — `👨‍👩‍👧` is seven code points, so
`maxLength={1}` truncates it into a lone `👨`.

That last point alone rules the approach out for a field that must hold exactly one emoji.

---

## 4. Emoji data

All sizes measured by downloading the tarballs from the npm registry and running `ls -l` on the
extracted files, 2026-09-02.

### unicode-emoji-json

[`unicode-emoji-json@0.9.0`](https://www.npmjs.com/package/unicode-emoji-json), published
2026-04-18, MIT, no dependencies. Total unpacked 838 KB, of which:

| File | Size |
|---|---|
| `data-by-group.json` | 422,110 bytes (412 KB) |
| `data-by-emoji.json` | 387,444 bytes (378 KB) |
| `data-ordered-emoji.json` | 23,224 bytes (23 KB) |
| `data-emoji-components.json` | 248 bytes |

It is [Emoji Version 17.0](https://github.com/muan/unicode-emoji-json/releases) as of 0.9.0, and
**RGI only** — its README states it excludes minimally-qualified and unqualified sequences. It holds
1,914 base emoji across 9 groups (Smileys & Emotion 171, People & Body 388, Animals & Nature 160,
Food & Drink 131, Travel & Places 219, Activities 85, Objects 266, Symbols 224, Flags 270), with
skin-tone variants represented by a `skin_tone_support` boolean rather than expanded rows. Minified,
`data-by-emoji.json` is 303,161 bytes.

Its per-entry shape is small and useful:

```json
"😀": { "name": "grinning face", "slug": "grinning_face", "group": "Smileys & Emotion",
        "emoji_version": "1.0", "unicode_version": "1.0", "skin_tone_support": false }
```

That `emoji_version` field is what makes section 5 tractable.

### emojibase-data

[`emojibase-data@17.0.0`](https://www.npmjs.com/package/emojibase-data), published 2025-11-17, MIT.
**50,042,068 bytes unpacked (47.7 MB)** — because it ships every locale. The English subset is what
you would actually import: `en/data.json` is 775,157 bytes (757 KB), `en/compact.json` is 571,441
bytes (558 KB), plus a `shortcodes/` directory. The companion runtime package
[`emojibase@17.0.0`](https://www.npmjs.com/package/emojibase) is 159,706 bytes. Richer than
`unicode-emoji-json` (shortcodes, multiple shortcode presets, per-locale annotations) and far
heavier.

### emoji-datasource

[`emoji-datasource@16.0.0`](https://www.npmjs.com/package/emoji-datasource), published 2025-09-24,
MIT, from [iamcal/emoji-data](https://github.com/iamcal/emoji-data). **28,538,202 bytes unpacked
(27.2 MB)**, because it bundles sprite sheets and per-vendor PNGs. It is the right dependency if you
want to render *images* rather than system font glyphs — which we do not. This is what the dead
`react-native-emoji-selector` pulls in.

### A curated subset as a plain TypeScript constant

Yes, comfortably. I generated the constant from `unicode-emoji-json@0.9.0` and measured the source
bytes for the exact shape this codebase uses (`Option<T>` from `src/types/core.ts` — `{ value,
label }`, `CONSTANT_CASE`, `as const`):

| Emoji in list | Source bytes | KB |
|---|---|---|
| 100 | 5,103 | 5.0 |
| 200 | 9,804 | 9.6 |
| 300 | 14,562 | 14.2 |

The emoji characters alone, with no labels, are 545 / 1,097 / 1,979 bytes for the same three counts.

So a 200-emoji curated list is **9.6 KB of TypeScript** against **222.5 KB** for the JSON
`rn-emoji-keyboard` bundles, or 378 KB for the full `unicode-emoji-json` file. It has no licence
question at all, since the emoji characters themselves are Unicode code points, not licensed
content — only the *names* come from Unicode, and the `unicode-emoji-json` package that derives them
is MIT.

---

## 5. Rendering and storage

### Storing the character in Postgres

The emoji is text. Supabase databases are UTF-8, and Postgres stores any valid UTF-8 in `text`
without special handling. The one trap is length: Postgres's `character_length()` counts
**characters (code points), not user-perceived glyphs**
([Postgres string functions](https://www.postgresql.org/docs/current/functions-string.html)). A
family ZWJ sequence is seven code points and one visible glyph, so a `CHECK (char_length(icon) = 1)`
constraint would reject it, and a `varchar(4)` would truncate it into nonsense. JavaScript has the
same problem from the other end — `'👍'.length` is 2, because it is a surrogate pair.

**If we constrain, constrain generously**: `CHECK (char_length(icon) BETWEEN 1 AND 16)`, or validate
against the shipped list instead, which is stricter and simpler.

### What varies across platforms

Three separate failure modes, in increasing severity:

1. **Glyph appearance.** Every vendor draws its own. Apple Color Emoji and Google's Noto Color Emoji
   are different artwork for the same code point. This is expected and fine — it is how emoji have
   always worked, and users read it as "my phone's emoji".
2. **Missing glyphs for newer Unicode versions.** A device whose emoji font predates a code point
   renders **tofu** (☐). Android's own documentation is explicit:
   [*"later emoji might be displayed as a small square box called tofu (☐) or other incorrectly
   rendered emoji sequences"*](https://developer.android.com/develop/ui/views/text-and-emoji/emoji2),
   and that *"Android versions 11 (API level 30) and lower can't update the emoji font, so apps that
   display them on those versions must be updated manually."* Only Android 12+ updates the emoji
   font on its own; below that the `androidx.emoji2` library with a downloadable-fonts provider is
   the fix.
3. **ZWJ sequences and skin-tone modifiers degrade, they do not fail.**
   [UTS #51](https://www.unicode.org/reports/tr51/) specifies the fallback: for an unsupported ZWJ
   sequence *"the ZWJ characters are ignored and a fallback sequence of separate emoji is
   displayed"* — so `👩‍❤️‍👩` becomes `👩❤️👩`, three glyphs where one was intended. For skin tones,
   *"if an emoji modifier base has no skin visible on a particular system, then any following emoji
   modifier should be suppressed."* Neither shows tofu, but both change what the user sees, and a
   stored string that renders as one glyph on the author's phone can render as three on a
   housemate's.

The presentation selector `U+FE0F` is the quieter version of the same issue: some code points
(`❤`, `☂`) default to a monochrome text glyph without it and a colour emoji with it, so `❤` and
`❤️` are different strings that look different. **Always store the fully-qualified form.**
`unicode-emoji-json` is RGI-only and fully qualified, so copying keys from it gets this right for
free.

### The safe subset, and why iOS 16.4 settles it

Emoji version release dates, taken from the `# Date:` header of `emoji-test.txt` in each version
folder under [unicode.org/Public/emoji/](https://www.unicode.org/Public/emoji/):

| Emoji version | Data file date | New base emoji in `unicode-emoji-json` | Cumulative |
|---|---|---|---|
| E0.6–E5.0 (2010–2017) | — | 1,371 | 1,371 |
| E11.0 | 2018 | 77 | 1,640 |
| E12.0 / E12.1 | 2019 | 98 | 1,738 |
| E13.0 | 2020-01-21 | 67 | 1,805 |
| E13.1 | 2020-09-12 | 7 | 1,812 |
| E14.0 | 2021-08-26 | 37 | 1,849 |
| E15.0 | 2022-08-12 | 21 | 1,870 |
| E15.1 | 2023-06-05 | 28 | 1,898 |
| E16.0 | 2024-08-14 | 8 | 1,906 |
| E17.0 | 2025-08-04 | 8 | 1,914 |

(Counts computed from the `emoji_version` field of `unicode-emoji-json@0.9.0`'s
`data-by-emoji.json`. The E17.0 chart at
[unicode.org/emoji/charts/emoji-versions.html](https://www.unicode.org/emoji/charts/emoji-versions.html)
gives 163 for 2025 because it counts sequences and variants too; the table above counts base emoji
only.)

Vendor support:

- **iOS.** Emoji 16.0 shipped in **iOS 18.4 on 2025-03-31**, adding eight glyphs including the
  Sark flag ([Emojipedia's iOS 18.4 changelog](https://blog.emojipedia.org/apple-ios-18-4-emoji-changelog/)).
  Apple's pattern is a spring x.4 release each year, so Emoji 15.1 landed in iOS 17.4 and Emoji 15.0
  in iOS 16.4. Apple publishes no per-release emoji-version statement of its own that I could find,
  so this line is Emojipedia's record, not Apple's — treat the exact mapping as well-attested rather
  than official.
- **Android.** Google's Noto Emoji release tags give hard dates:
  [v2.040 "Unicode 15.1" on 2023-11-17, v2.047 "Unicode 16.0" on 2024-10-03, v2.051 "Unicode 17.0"
  on 2025-09-15](https://github.com/googlefonts/noto-emoji/releases). Shipping to devices lags the
  font release, and on Android 11 and below never happens at all without `emoji2`.

**Here is the part that makes this easy.** This app's iOS deployment target is **16.4**
(`ios/Podfile:25`), which is the floor Expo SDK 56 and 57 impose. iOS 16.4 shipped Emoji 15.0. So
**every iOS device capable of running Crumpet already has full Emoji 15.0 coverage**, and only the
57 emoji added in E15.1, E16.0 and E17.0 can tofu — and only on devices that have never taken a
point update.

The practical safe subset, in order of caution:

- **Bulletproof: E0.6–E5.0.** 1,371 base emoji, all defined by 2017, present on every iOS and
  Android device in circulation. A curated 200 easily fits inside this and covers every pet, food,
  animal, activity and household concept the app needs.
- **Safe for this app: through E15.0.** 1,870 base emoji, guaranteed by the iOS 16.4 floor. Android
  is the only exposure, and only on 11 and below.
- **Avoid: E15.1 and later**, plus **all multi-person ZWJ sequences** and **flags**. Flags are the
  worst of the set — some platforms never render regional-indicator pairs as flags at all.
- **Skin-tone modifiers are fine** on the base people emoji, but they double the storage length and
  add a variant axis to a picker that does not need one. Ship the neutral yellow forms.

---

## Recommendation

**Build it ourselves: a curated `EMOJI_OPTIONS` constant in `src/constants/`, rendered as a grid
inside a `BaseSheet`.**

Concretely: 150–250 emoji picked by hand and grouped into 4–6 categories that mean something for a
pet app, each entry `{ value: '🐶', label: 'dog face' }` typed as `Option<string>[]` per the
`Option<T>` convention. All drawn from E5.0 or earlier. Search is a `.filter()` over `label` with the
existing `use-debounce` hook — no index, no library. Render with `@legendapp/list` (already a
dependency) or a plain `FlatList` with `numColumns`; 200 items in a grid does not need
virtualisation cleverness.

**The trade-off, stated honestly.** We give up completeness. A user who wants 🪩 or an emoji we did
not think of cannot pick it, and someone will eventually notice. We also take on the curation — a
one-off afternoon, and a small ongoing "add this one" trickle. In exchange: 9.6 KB instead of
222.5 KB, zero dependencies, no stale-data problem, no unmaintained-package risk, no React Compiler
hazard, guaranteed rendering on every device that can install the app, and a grid that matches the
app's own theming and `BaseSheet` conventions rather than approximating them. For a field that names
a pet, a household or a care item, a curated set is arguably *better* product design than 1,914
options — it is a shortlist, not a limitation.

**Second choice: `rn-emoji-keyboard`'s static `EmojiKeyboard`, mounted inside a `BaseSheet`.**
Use the non-modal component, not the library's own `<EmojiPicker>` modal — stacking a modal on a
native sheet is the rough edge this codebase already documents, and issues
[#207](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/207) and
[#181](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/181) are exactly that. It gives
the full set with search and categories for one dependency and no native code. Accept in return:
Emoji 15.0 data frozen since 2022, no publish since May 2024, no maintainer statement on RN 0.86 or
React 19, and the render-body `setState` in
[#209](https://github.com/TheWidlarzGroup/rn-emoji-keyboard/issues/209) that React Compiler is
entitled to assume away. Verify it on a device before committing to it, and be ready to fork.

`rn-expo-emoji-picker` is the one to revisit in six months. It is built for exactly this
architecture, but one version and 1,142 weekly downloads is not a foundation yet.
