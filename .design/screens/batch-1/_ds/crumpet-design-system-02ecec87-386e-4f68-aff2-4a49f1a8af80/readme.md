# Crumpet Design System

Crumpet is a pet-care coordination app for iOS. A household shares one or more pets, members log feeds, and the app flags the ones nobody logged. It is a side project at side-project pace; feeding is the daily habit, and everything else earns its place around it.

This project is the design system for that app: the palette, the type, the geometry, the reusable primitives, and a click-through recreation of the real screens.

## Sources

Everything here was read from material the user supplied. Nothing was inferred from screenshots.

| Source | What it gave |
| --- | --- |
| `pawly-expo/` (attached local codebase, Expo / React Native, app id `com.crumpet.app`) | Component implementations, `src/constants/theme.ts`, `src/constants/icon-map.ts`, the screens under `src/app/(protected)/`, and the docs below |
| `pawly-expo/CONTEXT.md` | The domain glossary — the source of truth for every product word |
| `pawly-expo/docs/PRODUCT_BRIEF.md` | Product scope, target user, design direction |
| `pawly-expo/docs/THEMING.md` | The shipped theme, and the rules around it |
| `pawly-expo/docs/adr/0034-…-gold-as-a-fill.md` | Why the palette is gold and why `primary` is a fill |
| `uploads/tokens.css` | The **golden visual system** decided in CRU-087/088 — the design source of truth, ahead of the code |
| `uploads/icon.png` | The 1024px app icon |

**Where the two disagree, `uploads/tokens.css` wins.** It carries the banner washes, the two-layer shadows and the Gabarito heading face, none of which are in `src/constants/theme.ts` yet — that port is an open code ticket. The colour values themselves already match.

There is no Figma file and no marketing site. The only product surface is the iOS app.

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | The entry point. `@import`s only. Consumers link this one file. |
| `tokens/` | `colors.css`, `typography.css`, `spacing.css`, `elevation.css`, `motion.css`, `fonts.css` |
| `components/` | The React primitives, grouped by concern — see below |
| `ui_kits/crumpet-ios/` | A click-through recreation of Home, Posts, Profile, the Inbox and the log tray |
| `guidelines/` | Foundation specimen cards (Colors, Type, Spacing, Motion, Brand) |
| `assets/` | The app icon, the flat brand mark, a photo placeholder |
| `SKILL.md` | Agent-skill front matter, for use outside this project |

### Components

Grouped by concern. Each directory holds one `.jsx` + `.d.ts` + `.prompt.md` per component and one `@dsCard` HTML.

- **`components/core/`** — `AppText`, `Icon`, `MainButton`, `IconButton`, `Divider`
- **`components/forms/`** — `TextField`, `SegmentedControl`, `ToggleSwitch`
- **`components/display/`** — `HomeBanner`, `Tile`, `UserAvatar`, `PetAvatar`, `StatusPill`, `EmptyState`
- **`components/feeding/`** — `PetCard`, `OccurrenceRow`
- **`components/posts/`** — `PostCard`
- **`components/navigation/`** — `TabBar`, `SettingsRow`, `SheetRow`

Every one of these has a counterpart in `pawly-expo/src/components/`. Two names differ from the source file, and deliberately: `TextField` is the app's `TextInputValidated` without the react-hook-form wiring, and `PetCard` is `PetSection` without its data hooks.

**Intentional additions.** `HomeBanner` and `TabBar` have no component file in the codebase — the banner is specified in `uploads/tokens.css` but not yet built, and the tab bar is a native iOS control the app configures rather than draws. Both are named surfaces in the "gold has three jobs" rule, so the system would be incomplete without them. `Icon` wraps the Lucide set the app already depends on.

**Deliberately not built.** `Accordion`, `ActionPopover`, `FlowStepper`, `VerificationCodeInput`, `DayOfWeekPicker`, `CommentThread`, `Tray` and the care-card forms all exist in the codebase but are single-screen machinery rather than reusable primitives. Ask and they can be added.

---

## Content fundamentals

**The glossary is the law.** `CONTEXT.md` defines the product's words and lists what each one replaces. The important ones:

- A **Household** is never a family, group, team or account.
- A **Member** is not a User. A User is the account; a Member is that account's place in a household.
- A **Feed Time** is never a meal or a slot. **Slot** is retired everywhere, including in code.
- **Activity** is feeding history. It is never "the feed" — that word invites the public social product the brief permanently bans.
- **Posts** is the tab that holds Posts. Never a timeline, a stream, a wall, or "the feed".
- An **Occurrence** is internal vocabulary. A member reads the name and the time, never the word.

**The single hardest rule: never claim the pet was not fed.** The app knows one thing — whether anyone tapped Log. Internally the condition is a *Missed Feed*; on screen the label is always **Not logged**. It describes the record, not the animal, and it names its own remedy. The push copy follows the same line: "No one has logged Bailey's morning feed", never "Bailey hasn't been fed". Getting this wrong is the trust failure the product brief calls fatal.

**Australian English.** Colour, apologise, organise, personalise, timezone as one word. Times are lower-case with a space: `7:00 am`, `5:30 pm`. Dates are day-first: *Saturday, 30 August*.

**Voice.** Plain, warm, matter-of-fact, and short. It is the voice of a housemate leaving a note, not an app being friendly at you. It states what happened and, if something needs doing, says what to do.

- Second person for the reader, first-person-plural never. "Add Bailey's feed times and everyone will know when they are due."
- Names, not roles, wherever a name is known. "Sarah, 7:04 am" — not "Logged by a member".
- Sentence case everywhere. Buttons carry no full stop; sentences in descriptions do.
- Real examples from the app: *"A snack, or a feed that is not on the schedule."* · *"Nothing shared yet"* · *"Photos your household shares of your pets show up here. Handy when someone else is looking after them."* · *"Paused — no feeds expected"* · *"Bailey is paused. No feeds are expected and nobody is nudged."*
- Curly apostrophes in prose (`Bailey’s`), and the em dash used sparingly with spaces around it.
- Counts read as records, not meals: **"Logged twice today"**, never "Fed twice today".
- Empty states name the absence and then the remedy. They never scold and never joke.
- **No emoji.** Not in copy, not in notifications, not as icons. The mascot is the app icon and nothing else.

**Errors** say what happened in one clause and what to do in the next: "That address is already in this household." No stack, no apology, no exclamation mark.

---

## Visual foundations

### The ground

The page is `#FAF6EF`, a warm off-white. This is the load-bearing decision: gold on a cool grey read as cheap, gold on black read as an alert, gold on warm off-white read as brand. Cards are pure white on top of it. There are two surface pairs and mixing them is a bug: `background` behind `background-element` on a screen, `background-sheet` behind `background-sheet-row` inside a sheet.

### Colour

Warm throughout, and narrow on purpose. Text is `#1C1815` — a warm near-black, never `#000`, which reads as a hole punched in cream.

**Gold has exactly three jobs**: the Home banner wash, the Log chip, and the active tab. A fourth drains the meaning from the other three, so adding one is a decision rather than a default. Gold marks *what needs doing*; teal `#10696B` marks *what is done*, which is why the tick is teal.

`--primary` is a **fill and never text** — `#F0A81C` on white is 2.0:1. A gold label is `--primary-text` `#9E6404`. A label on a gold fill is `--on-primary` `#2A1D06`, near-black, never white.

There is no colour per pet and no identity palette. A pet is told apart by its photo, a member by their avatar. An avatar without a photo falls back to `--background-selected`, not gold: a person is not an action.

### Type

**Gabarito** for headings, **Inter** for body — both Google Fonts under the Open Font Licence, loaded from Google's CDN (`tokens/fonts.css`); no binaries ship with this system. Headings are 700 with `-0.5px` tracking above 27px. The workhorse pairing across the app is a 15px primary line over a 13px `--text-secondary` line. Sizes are the ones the app actually passes — 11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 27, 30, 32 — and are not on a modular scale. Do not snap them to one.

### Geometry

Spacing is named, not numeric: `half` 2, `one` 4, `two` 8, `three` 16, `four` 24, `five` 32, `six` 64. It is not a 4/8 grid — `six` jumps to 64 because it is a section break. The screen gutter is 24px, and content caps at 800px.

Radii: `tile` 12, `card` 24, `banner` 28, `full` 100. Every button and every tap-target circle is `full`. The single 8px corner in the app is the text field. Controls have **fixed heights** — 28 / 34 / 42 / 50 — so a chip and a label of different sizes still line up in one row; the 28px chip carries 8px of hit slop to clear the 44px minimum target.

### Elevation, borders and blur

Two layers per shadow: a 1px contact shadow under a soft spread. The colour is `#4A3A26`, warm brown-black — a neutral grey shadow on cream reads as dirt. Cards use `medium`; sheets and floating buttons use `large`.

Lines are `--border` (13% of `#3A3026`) and nothing else. Never a fill token for a rule (it vanishes on white) and never secondary text (it competes with the content either side). The dashed "Other" row is the one exception, at `--ghost-border`.

Transparency and blur appear in exactly two places: the tab bar, and the `glass` button variant that maps to iOS 26 Liquid Glass. Below iOS 26 glass falls back to `secondary`'s opaque fill. Glass is a material, not an accent — the emphasised action never sits behind it.

### Backgrounds and imagery

No gradients anywhere except the Home banner, which is a 118° linear wash in one of four times of day (dawn, day, dusk, night) with its own ink token. No patterns, no textures, no full-bleed photography, no illustration — the system ships **no artwork**, and `EmptyState` has no illustration slot yet for exactly that reason. The only imagery is user content: pet photos and Post photos, which sit in fixed square frames on `--post-divider`. Photos are warm and domestic by nature and are never filtered or tinted.

### Motion

Fast, short, and never bouncy. Press is a 96% scale plus a drop to 90% opacity over 100ms; icon-only targets drop to 50% opacity instead of scaling. A pet card expands in 220ms and collapses in 160ms. When a feed is logged the Log chip fades out over 120ms and the tick lands 160ms later at a slight 1.06 overshoot — the two are sequenced rather than crossfaded, because overlapping them smears the pill. Easing is `cubic-bezier(.23, 1, .32, 1)`. The one spring in the app is the segmented-control thumb: 400ms, critically damped, so it cannot overshoot its track. Every entrance respects the system reduce-motion setting.

### Hover and press

This is a phone app: there are no hover states. Press is the only feedback, and it is opacity plus scale, never a colour change. Disabled is 50% opacity, with no colour swap.

### Layout rules

One fixed element: the tab bar, 84px including the safe area (`--bottom-tab-inset`). Anything floating above it — the log button — is offset by that number. Screen padding lives on the scroll *content*, never the frame, so full-bleed children (Posts) are possible and the scroll indicator stays on the edge. A Post is full-bleed with no radius; the 12px `--post-divider` band between two of them is the only thing separating them.

---

## Iconography

**Lucide, and only Lucide.** The app depends on `lucide-react-native` and maps a short product name to each glyph in `src/constants/icon-map.ts` (ADR 0008). This system reproduces that map verbatim in `components/core/Icon.jsx`, drawing from `lucide-static` on unpkg — **a CDN substitution for the native package, flagged here**; the glyphs and stroke weights are identical, so nothing was redrawn.

- Default stroke is Lucide's own 2px. Sizes in use: 16 default, 18 on a settings row, 20–22 in content, 24 in the tab bar, 28 in an empty state.
- Colour is `text` or `text-secondary`. A decorative glyph **never** borrows the brand colour — that rule cost fourteen call sites when gold arrived. The tick is `success`; the Like heart is `like` and is the only filled glyph in the app.
- The tab bar uses Apple **SF Symbols** on device (`house.fill`, `photo.on.rectangle`, `person.fill`), not Lucide. The web recreation substitutes the nearest Lucide equivalents.
- **No emoji, ever**, and no unicode characters standing in as icons. There is no icon font.

### The brand mark

There is **no logo and no wordmark**. The only mark is the app icon: a pale cream crumpet on a marigold ground (`assets/app-icon-1024.png`, and the flat vector-style variant `assets/crumpet-welcome.png`). The palette answers to that icon, not the other way round. Where a mark is needed, use the icon; where a name is needed, set *Crumpet* in Gabarito Bold. Do not draw a new mark.

---

## Known gaps

- **Dark mode is unproven.** It exists so every token key resolves; it has not been designed or judged on a device. Do not treat its values as settled and do not extend it without asking.
- **No photography and no illustration.** `assets/photo-placeholder.png` stands in wherever a photo goes.
- **Fonts are CDN, not bundled.** No `.ttf` files were supplied. The app bundles Inter natively; Gabarito is new and not yet added to the native build.
