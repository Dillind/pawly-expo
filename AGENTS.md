# AGENTS.md

Guidance for AI agents (and humans) working in this repository. `CLAUDE.md` imports this file.

## ⚠️ Read the versioned Expo docs first

Expo changes fast and the model's training data is often stale. This project is on **Expo SDK 57**. Before writing or changing any code that touches Expo/React Native APIs, read the exact versioned docs: **https://docs.expo.dev/versions/v57.0.0/**. `package.json` is the source of truth for versions.

## What this project is

**Crumpet** — a pet-care coordination app (iOS first). A household shares responsibility for a pet; members log feeds, everyone gets notified, and the app flags missed feeds. Starts with dog feeding but is intentionally pet-general.

- **Product (the what and why):** [docs/PRODUCT_BRIEF.md](./docs/PRODUCT_BRIEF.md)
- **Architecture (the shape):** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Decisions (the small ones):** [docs/DECISIONS.md](./docs/DECISIONS.md)
- **Knowledge (the traps):** [docs/KNOWLEDGE.md](./docs/KNOWLEDGE.md)
- **Architecture decisions (the big ones):** [docs/adr/](./docs/adr/)
- **Tech stack (with install status):** [docs/TECH_STACK.md](./docs/TECH_STACK.md)
- **Theming:** [docs/THEMING.md](./docs/THEMING.md)
- **Domain language (glossary):** [CONTEXT.md](./CONTEXT.md) — use these exact terms

### Which of these to read, and when

**Always, at the start of a session:** `ARCHITECTURE.md` and `KNOWLEDGE.md`. The first tells you
where behaviour actually lives — much of it is in Postgres, not `src/`. The second is a list of
things that have already cost someone hours, including several where the code compiles, the tests
pass, and the feature is still broken.

**Before naming anything or discussing the domain:** `CONTEXT.md`.

**Before changing how something works:** search `DECISIONS.md` and `docs/adr/` for it first. If a
choice looks wrong, check whether it was already made deliberately.

**Before planning a feature:** `PRODUCT_BRIEF.md`, especially Out of Scope.

### Which of these to write, and when

Keep them current in the same change, not afterwards. All four are prose for a reader — no bloat,
no restating what the code already says.

| You have                                                                             | Write it in       |
| ------------------------------------------------------------------------------------ | ----------------- |
| Introduced or sharpened a domain term                                                | `CONTEXT.md`      |
| Made a choice someone would question, explainable in a sentence or two               | `DECISIONS.md`    |
| Made a choice that changes the system's shape, or needs its alternatives spelled out | a new ADR         |
| Lost time to something non-obvious, or found a trap that survives the fix            | `KNOWLEDGE.md`    |
| Changed how the layers fit together                                                  | `ARCHITECTURE.md` |

The `DECISIONS.md` / ADR line is the one that needs judgement: if you can give the reasoning in two
sentences it is a `DECISIONS.md` entry, and if you need to lay out the options it is an ADR.

**`KNOWLEDGE.md` is the one most often skipped and the most valuable.** A bug you fixed is worth an
entry only if the next person would fall into it again — a fixed typo is not, "typecheck passes on a
route that does not resolve" is.

**`docs/adr/` is tracked.** It was gitignored between `79c650d` and this commit, and all nineteen
files were deleted from the working tree during that window. They are restored. Two things follow:

- **Numbering came out of that window damaged.** The CRU-008 invite design of 2026-08-05 wrote
  ADRs numbered 0016–0018, but those numbers belong to the late-feed, posts and post-editing
  decisions. Those three invite ADRs were never committed and no longer exist. Their content
  survives in [issue #44](https://github.com/Dillind/pawly-expo/issues/44). **Take the next number
  from `ls docs/adr/`, never from memory.**
- **`docs/agents/` is still gitignored**, so `git add` skips new files there without saying so.
  `git add -f` is the only way one reaches a commit, and that is a deliberate act.

## How to write your replies

This is about the chat, not the code. It applies to every message.

Use plain language. Write short sentences. One idea per sentence.

Do not compress. A sentence that packs three clauses together is harder to read than three
sentences, even though it is shorter. Length is not the thing to optimise. Clarity is.

Specifically:

- Prefer a common word to a fancy one. "Use", not "utilise". "Stop", not "cease".
- Break up long sentences. If a sentence needs a semicolon or a dash to hold it together, it is
  probably two sentences.
- Say the point first, then explain it. Do not build up to it.
- Cut throat-clearing. "It is worth noting that X" is just "X".
- Avoid stacked qualifiers. "This may potentially be somewhat risky" means "this is risky".
- Do not stack nouns. "Notification permission prompt priming flow" is unreadable.
- Explain a term the first time you use it, or use a simpler one.

Being brief is good. Being dense is not. If you have cut a message down so far that the reader has
to unpack it, you have gone too far — expand it back out into more, simpler sentences.

## Commands

Every script is in `package.json`. `bun run check` is the gate: typecheck, lint,
`format:check`, spellcheck and test, in that order, stopping at the first failure. It takes about
13 seconds.

Four things run it, and you are the least reliable of them: a `Stop` hook at the end of every Claude
turn, the `pre-commit` git hook on every commit, GitHub Actions on every pull request, and you by
hand. Only CI sees every change — a Claude hook binds an agent, and a git hook is skipped by
`--no-verify`. Details, and the one case a pre-commit hook cannot catch, are in
[docs/conventions/gates.md](./docs/conventions/gates.md).

`bun install` wires the git hook through the `prepare` script. `bun run hooks:install` does it by
hand.

The build scripts always name a profile, deliberately. A bare `eas build` defaults to
**production**, whose EAS environment holds no variables, so the build dies at
`src/lib/supabase/client.ts` with "Missing EXPO_PUBLIC_SUPABASE_URL or
EXPO_PUBLIC_SUPABASE_KEY". Only the `development` environment is populated — `.env` is
gitignored and never reaches the builder, so anything the app reads from
`process.env` has to exist as an EAS environment variable too (`eas env:list`).

### Releasing

Build profiles, TestFlight, submit credentials and the absent `qa` profile live in the
**`eas-release`** skill. Invoke it before any `eas build` or `eas submit`.

## Tests

`jest-expo` + `@testing-library/react-native`. **Run `bun run check` before finishing** — it is
typecheck, lint, format:check, spellcheck and test in one, and stops at the first failure.

Tests live in a top-level **`tests/` mirroring `src/`**, so the path tells you what is covered:

```
tests/lib/dates.test.ts              covers  src/lib/dates.ts
tests/services/pet.service.test.ts   covers  src/services/pet.service.ts
```

The mirror extends past `src/`. An Edge Function's **pure** modules are testable the same way, and
`tests/functions/send-alerts/message.test.ts` covers
`supabase/functions/send-alerts/message.ts`. Only the pure ones — anything reaching for `Deno` or a
Supabase client does not run under Jest.

Name them `<name>.test.ts`. No `__tests__` folders, and nothing beside the source file.

**What is worth testing here:** pure logic (`lib/dates.ts`, `utils/`), the Zod schemas, and the
row↔domain mapping in services. A service test mocks `@/lib/supabase/client` and asserts the
columns — `PetService.update` turning `birthdateIsApproximate` into `birthdate_is_approximate` is
locked down precisely because that leaked into component code once already.

**What a unit test here cannot tell you**, and do not pretend otherwise:

- **The SQL.** `slot_states`, `log_feed`, the Grace Window arithmetic and the missed-feed sweep are
  the real logic of this app and they live in Postgres. Jest cannot reach any of it. That wants
  pgTAP against a local `supabase db reset`.
- **Anything native.** TrueSheet, the SwiftUI picker in `dropdown-picker-validated.ios.tsx`, native
  tabs. Jest renders mocks. A test that calls `onValueChange` on a mocked `Switch` passes happily
  while the real control is dead on device — which is exactly the state of the Feed Logged Alerts
  toggle. Verify native surfaces on a device with Argent, not in Jest.

Timezone helpers are asserted against fixed instants and pass under any device clock — the suite is
run under `TZ=UTC`, `America/New_York` and `Pacific/Kiritimati`. Keep it that way: a test that only
passes in Melbourne is testing the machine, not the code.

## Branches

Every feature or non-trivial change gets a branch, named **before** work starts — never commit
straight to `main`:

```
<type>/CRU-<nnn>-<kebab-case-slug>     e.g. feat/CRU-004-home-missed-feeds
```

`<type>` is the commit-type vocabulary (`feat`, `fix`, `chore`, `docs`, `refactor`); the ticket ID
is uppercase and zero-padded to three digits. Git refnames forbid spaces and `[`, so brackets never
appear in a branch name — only in the PR title (`[CRU-004] Show missed feeds on Home`).

The prefix was `PAW-` through `PAW-003`, when the app was called Pawly. `CRU-` picks up at 004 —
**the numbering is continuous, only the prefix changed**, so there is exactly one ticket 004.
Existing `PAW-` branches, commits and PR titles are history; never retroactively renumber them, and
a PR for a `PAW-` branch keeps its `PAW-` title.

IDs come from what already exists, not an external tracker: `git fetch --all --prune`, then take the
highest existing `PAW-nnn` **or** `CRU-nnn` and add one — matching only `CRU-` would restart at 001.
**Look at open issues too, not only git.** A number is often allocated to an issue before any branch
carries it, and a lookup over branches and commits alone hands the same number out twice — CRU-095
is on both issue #126 and PR #130 because of exactly that. Full command and PR conventions live in
the `create-pr` skill.

## Toolchain

- **Package manager: bun.** `bun.lock` is the only lockfile; `package-lock.json` was deleted (it was stale and still listed the removed `phosphor-react-native`). Don't reintroduce npm/yarn/pnpm lockfiles — `packageManager` in `package.json` pins the version.
- **Node: 24**, pinned with [Volta](https://volta.sh) (`volta.node` in `package.json`). Install Volta once (`curl https://get.volta.sh | bash`) and the correct Node is selected automatically inside this repo — no `nvm use`, and it works in non-interactive shells, CI, and agent tool calls, which is precisely where `.nvmrc` silently does nothing. `.nvmrc` is kept for anyone still on nvm; the two must be bumped together.
- The `engines` floor is 22.18.0 because `cspell` requires it — on Node 20 the spelling gate doesn't just fail, it cannot run at all, so `bun run spellcheck` exits non-zero for a reason that has nothing to do with spelling.

## Adding dependencies

Always use **`bunx expo install <package>`** so the version matches SDK 57. Do not hand-pick versions with a raw `bun add` for Expo-ecosystem packages.

## Conventions

### Before changing any UI

Invoke both skills **before** writing UI code — not after, not to review what you already wrote:

- **`/frontend-design`** — design judgement: hierarchy, spacing, states, what the screen is actually for.
- **`/expo-native-ui`** — the SDK 57 native surface, so the answer is the platform's component rather than a hand-rolled approximation of it.

This applies to any change to layout, styling, copy, navigation, screen composition, or a new component — including "small" ones. It does not apply to pure data/query/migration work with no visible surface.

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

### Naming & imports

- **Files and folders are `kebab-case`** (`app-text.tsx`, `use-push-notifications.ts`). Do not introduce `PascalCase`/`camelCase` filenames.
- **Path aliases:** `@/*` → `src/*`, `@/assets/*` → `assets/*` (see `tsconfig.json`). Prefer `@/` imports over deep relative paths.
- Components are typically default-exported; hooks/utilities named-exported (follow the surrounding file).

### Navigation

Expo Router (file-based). Auth is enforced with `Stack.Protected` guards in `src/app/_layout.tsx`; routes are split into `(public)` and `(protected)` groups. The authenticated area uses Expo Router **native tabs** (`expo-router/unstable-native-tabs`), not a JS tab bar. Auth is wired with real Supabase authentication via `useAuthSession` and `useAuthStore`.

**A dynamic route is a folder, never a file.** `[param]/index.tsx`, with that entity's other screens
as siblings inside it. `src/app/(protected)/(tabs)/home/[petId]/` is the reference — `index.tsx` and
`care-card-editor.tsx`, registered as `[petId]/index` and `[petId]/care-card-editor`.

```
home/[petId]/index.tsx             ✅  one folder holds everything a Pet can do
home/[petId]/care-card-editor.tsx  ✅

post/[postId].tsx                  ❌  a static wrapper around one dynamic file,
edit-post/[postId].tsx             ❌  and the same entity split across two of them
```

**Add a `_layout.tsx` only when you want a nested navigator.** A folder without one keeps its
screens on the parent stack, which is usually what you want — a nested stack leaves its first screen
with nothing to pop to and the back button silently disappears.

**Titles and header options live in the `_layout.tsx`**, not in a `Stack.Screen` inside the screen
itself. Declaring the same option in both is two sources of truth for one header.

**The exception is a header that depends on the screen's own data.** A title that is a Pet's name
cannot be written by a layout, which has no reliable read of the focused route's params. Set it from
the screen with `Stack.Title`, and **put it outside every early return** — behind one the bar has no
title and falls back to the route name, so `[petId]/index` flashes until the data arrives. Prefer
making the header static and moving it to the layout, as removing a Pet did when it moved into the
Edit details tray.

**Moving a route has two consequences the compiler cannot see:**

- **Typecheck passes on a route that no longer resolves** — the generated types go stale. Open it on
  a simulator; a bad move shows as **Unmatched Route**.
- **Push payloads embed route paths.** `supabase/functions/send-alerts/message.ts` carries them, so
  the Edge Function needs redeploying, and notifications already delivered keep the old path.

### State

- **Local:** `useState` / `useReducer`.
- **Global (client):** Zustand.
- **Server/remote:** TanStack Query (`QueryClientProvider` is set up in the root layout). All Supabase/remote reads should go through Query.

**Zustand stores:**

- Split the store's type into `State` and `Action`, combined as `create<State & Action>(...)`. Don't inline everything into one type.
- Consume with a plain destructure, not a per-field selector:

  ```tsx
  // Do this
  const { setSchedule } = useOnboardingStore();

  // Not this
  const setSchedule = useOnboardingStore((state) => state.setSchedule);
  ```

  This is a deliberate trade-off, not an oversight: a plain destructure subscribes to the whole store, so the component re-renders on any field changing, not just the ones it reads. Accepted for the cleaner syntax — if a specific component's re-render cost from this ever becomes a real, measured problem, reach for `useShallow` there rather than reintroducing per-field selectors project-wide.

  ```tsx
  type State = {
    countryCode: string | null;
    phoneNumber: string | null;
  };

  type Action = {
    setContactInfo: (countryCode: string, phoneNumber: string) => void;
    reset: () => void;
  };

  const initialState: State = {
    countryCode: null,
    phoneNumber: null
  };

  const useForgotPasswordStore = create<State & Action>((set) => ({
    ...initialState,
    setContactInfo: (countryCode, phoneNumber) => set({ countryCode, phoneNumber }),
    reset: () => set(initialState)
  }));

  export default useForgotPasswordStore;
  ```

**Where a remote call lives — services, then query hooks. Never Supabase in a component.**

```
src/services/*.service.ts    the Supabase call + row<->domain mapping. No React, no TanStack.
src/hooks/queries/<area>/*.ts  useQuery / useMutation over a service. Query keys, invalidation.
src/hooks/*.ts               everything else (use-theme, use-styles, use-debounce, ...)
```

Query hooks are grouped by area — `household/`, `pet/`, `feeding/`, `posts/`, `alerts/`, `account/`.
Nothing sits loose at the top of `queries/`; a new hook joins an existing folder or starts one.

A service is a `namespace XService` of exported async functions with a default export — follow
`auth.service.ts`. **The service owns snake_case**: a column name must never reach a component, so
`PetService.update()` takes `{ birthdateIsApproximate }` and writes `birthdate_is_approximate`
itself. Domain types (`PetDetail`, `CareCard`, `FeedingSlot`, `PetPhoto`) are exported from the
service that produces them.

`import { supabase }` outside `src/services/` is the smell to look for. There is exactly one
exception, `src/lib/supabase/client.ts`, which creates it.

**TanStack Query — always destructure the hook's result, and rename as you go:**

```tsx
// Do this
const { mutate: deleteSlot, isPending: isDeleting } = useDeleteSlot(petId);

// Not this
const deleteSlot = useDeleteSlot(petId);
// ...later: deleteSlot.mutate(id), deleteSlot.isPending
```

The call site then reads `deleteSlot(id)` and `isDeleting`, not `deleteSlot.mutate(id)` and
`deleteSlot.isPending`. Rename `isPending` per mutation (`isSaving`, `isDeleting`) — a component
holding two mutations otherwise has two fields with the same name. Queries follow the same rule:
`const { data: slots = [], isLoading, isError, refetch } = useFeedingSchedules(petId)`.

### Telling the user what happened

Four different things, four different surfaces. Do not mix them up.

- **Form validation → inline.** Zod/react-hook-form errors render under the offending field. The
  validated inputs (`TextInputValidated`, `DropdownPickerValidated`, `DateTimePickerValidated`) do
  this themselves via `useFormContext` — but only when the input is given a **`name`** prop. An
  input without `name` silently cannot show its own error.
- **API failure → toast.** Network dropped, RLS denied the write, Postgres threw. Not attributable
  to a field, and the user cannot fix it by retyping.
- **Success → toast.** Every mutation confirms it landed.
- **A decision that has to be made now → alert.** See below.

### Alerts

`Alert.alert` from `react-native`, which is `UIAlertController` on iOS. There is no wrapper.

**Never use an alert for anything but a decision the user must make now** — a collision, a
destructive consequence, an irreversible step, discovered while the app carried out what they
asked for. Two buttons, one of them exactly "Cancel". A routine undoable action, anything merely
informative, and any validation error are a toast or an inline error, not an alert.

Full rules — when it qualifies, how to word the title, message and buttons, `isPreferred`
emphasis, and the live examples — are in **[docs/conventions/alerts.md](./docs/conventions/alerts.md)**.
Read it before you write or change one.

Toasts go through `@/lib/toast` (`showSuccessToast`, `showErrorToast`, `showInfoToast`) — never
import `toast` from `sonner-native` outside that file. The optional second argument is a
description; use it only for text a user can act on. Do **not** pass a raw `error.message` from
Supabase or Postgres into it: `new row violates row-level security policy` is a developer string,
and showing it is worse than showing nothing.

### Writing a feed log

**A feed log is created only through the `log_feed` RPC** — never `supabase.from('feed_logs').insert(...)`. The Double Feed check and the insert happen in one transaction, so a check issued as its own round trip could tell two members at once that there is no double feed and let both of them write. The RPC also takes a per-pet advisory lock, because sharing a transaction alone does not serialise them — two concurrent callers would otherwise each derive their answer from a snapshot taken before the other's insert.

`log_feed` returns either `{ status: 'logged' }` or `{ status: 'double_feed' }`, and in the second case **nothing was written** — calling again with `confirmed: true` writes unconditionally. Corrections and deletes still go through the table under the narrow column grants; only creation moved.

### Theming

`useTheme()` returns `{ colors, isDark, spacing }`. For StyleSheets, define a module-level `makeStyles` factory and call `useStyles(makeStyles)` inside the component. See [docs/THEMING.md](./docs/THEMING.md).

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
See [ADR 0008](./docs/adr/0008-lucide-icon-library-typed-icon-map.md).

```tsx
import Icon from '@/components/core/icon';

<Icon name="calendar" size={16} />;
```

An icon-only tappable control is `IconButton`, which owns the 44pt target and a **required**
`accessibilityLabel`. A bar button is `Stack.Toolbar.Button`, never a React view, and never
`variant="glass"` inside a native header.

Full rules — every prop, the four `IconButton` variants and why `glass` behaves differently,
`HeaderIconButton`, and how to add a new icon — are in
**[docs/conventions/icons.md](./docs/conventions/icons.md)**.

### Styling & theming

Custom theme tokens — **no component library, no NativeWind/Tailwind** (see [ADR 0004](./docs/adr/0004-custom-theme-no-component-library.md)). Full guide in [docs/THEMING.md](./docs/THEMING.md). In short:

- Colours via `useTheme()` (from `@/hooks/use-theme`) — returns the active light/dark palette. Never hard-code colour strings.
- Styles via a module-level `makeStyles` factory + `useStyles(makeStyles)` — see Theming above. `useStyles` takes no `deps`: the factory itself is the cache key, so wrap it in `useCallback` when it closes over props.
- Text via the `AppText` primitive; spacing via `Spacing` from `@/constants/theme`.
- `global.css` exists **only** for web font CSS variables — it is not Tailwind; do not delete it.

### Sheets

Bottom sheets are the default way to present secondary content — confirmations, quick forms, detail views. They use **`@lodev09/react-native-true-sheet`**, which wraps the real native sheet on each platform (`UISheetPresentationController` on iOS, `BottomSheetDialog` on Android). See [ADR 0010](./docs/adr/0010-truesheet-over-expo-router-form-sheets.md) for why this over Expo Router's built-in `formSheet`.

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
[ADR 0014](./docs/adr/0014-tray-is-one-sheet-with-swapping-content.md) for why it's one sheet and not
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

### Platform & device

Use `isIOS` / `isAndroid` / `isWeb` from `@/utils/platform`. Use the haptics helpers in `@/lib/haptics` (`hapticLight`, etc.) rather than calling `expo-haptics` directly.

### Notifications

Push handling lives in `use-push-notifications`, mounted once inside `AuthGate` in `src/app/_layout.tsx`. Two alert types (feed-logged, missed-feed) — see TECH_STACK, [ADR 0002](./docs/adr/0002-missed-feed-alert-engine.md) and [ADR 0012](./docs/adr/0012-recipient-controlled-alert-delivery-and-the-outbox.md).

**The only write path for a feed log is the `log_feed` RPC — never a table insert.** That was already true for the Double Feed guard; it now also decides whether anyone finds out. An after-insert trigger on `feed_logs` queues the `alerts` row, so a path that bypasses `log_feed` does not merely skip the guard, it silently sends no notification.

**Delivery is the recipient's decision, never the sender's.** There is no per-log "notify?" control and there must not be one — see ADR 0012. **Lateness no longer suppresses anything** (ADR 0029): a feed logged two hours late is still that feed, and the household is told. The 30-minute rule that used to record a Suppressed Alert was removed with the feeds rework.

**Sending is an outbox, not a direct call.** `feed_logs` → trigger → `alerts` → trigger → `pg_net` → the `send-alerts` Edge Function, which resolves recipients at send time. Anything that needs to notify a household inserts an `alerts` row; it does not call the Edge Function.

### Localisation

All user-facing text uses **Australian/British English** (colour, organise, cancelled, licence, favourite, grey, "tick" not "check", etc.). Applies to labels, buttons, errors, placeholders, toasts.

### Code style

- Prettier owns formatting; the settings are in `.prettierrc.json`. `bun run format:check` is in `bun run check`, so formatting is a gate, not a suggestion — run `bun run format` before you commit.
- **Imports are sorted by Prettier, not by hand.** `@ianvs/prettier-plugin-sort-imports` orders them: built-ins, third party, `@/` aliases, then relative, with a blank line between each group. An inline `type` specifier stays with its value import — the plugin merges them rather than splitting type imports into their own group. Never reorder an import block yourself; run `bun run format`.
- ESLint via `eslint-config-expo` (flat config). Run `bun run lint` before finishing.
- Spelling is checked with cspell (`bun run spellcheck`); add project words to `cspell.json` rather than disabling. The locale is `en,en-GB` deliberately — prose is British (`colour`), but code identifiers are American (`backgroundColor`, `colors`), so both dictionaries have to be active.

### Comments

Comments matter, but this codebase has been over-commented — long block comments justifying
ordinary code, and prose that re-states what the line already says. Default to fewer.

**Do not comment self-explanatory code.** If the function name, the variable name, or the logic
itself makes the intent clear, a comment is noise. Avoid:

- Describing what a function does when the name already says it (`// Returns the user's name` above `getUserName()`)
- Restating a line (`// Set loading to true` above `setLoading(true)`)
- JSDoc blocks on simple components or hooks whose props and signature are obvious
- Narrating a change (`// Now uses the RPC instead of an insert`) — that belongs in the commit message

**Do comment the _why_** when a future reader could not reasonably infer it from the code:

- A workaround for a platform bug or third-party library quirk
- A special case that looks wrong but is intentional
- Why an approach was chosen over the obvious alternative
- A constraint imposed by an external system (API behaviour, OS limitation, Postgres semantics)

Keep it to the shortest form that carries the reason — usually one or two lines. Reserve a long
block comment for a genuinely load-bearing decision, and prefer an ADR when the explanation is
really about architecture.

```ts
// Bad — noise, the code is obvious
// Check if the user is logged in
if (!token) return null;

// Good — a platform constraint the code cannot show on its own
// A response listener attaches after a cold-start tap has already been
// delivered, so useLastNotificationResponse is what replays it.
const lastResponse = Notifications.useLastNotificationResponse();
```

## Agent hooks

Two rules in this file are enforced mechanically, not by good intentions. The scripts live in
`scripts/` and the wiring is `hooks` in `.claude/settings.json`. `.gitignore` lists `.claude`, but
that file was force-added and stays tracked, so both travel with a clone — see
[docs/conventions/agent-hooks.md](./docs/conventions/agent-hooks.md) for the wiring and the full
rule table.

- **`scripts/check-boundaries.sh`** — `PostToolUse` on `Edit`/`Write`. Checks the one file just
  written, and only under `src/`. It catches a direct `lucide-react-native` import, the Supabase
  client outside `src/services/`, a `TrueSheet` value import outside `base-sheet.tsx`, `toast` from
  `sonner-native` outside `@/lib/toast`, a direct `feed_logs` insert, `watch()` where `useWatch`
  belongs, and a filename that is not kebab-case. Each of these passes typecheck and lint, which is
  why prose alone never held them.
- **`scripts/guard-branch.sh`** — `PreToolUse` on `Bash`. Blocks a `git commit` while `HEAD` is
  `main`. Reads are untouched.
- **`scripts/check-on-stop.sh`** — `Stop`. Runs `bun run check` when a turn that touched code ends,
  so failing work is never handed over as done. See
  [docs/conventions/gates.md](./docs/conventions/gates.md).

Both exit 2 with the reason, so the failure lands as a correction rather than as silence. The prose
rules stay in this file: a hook catches a violation after the fact and cannot explain the why.

## Agent skills

The three files below are in `docs/agents/`, which is untracked — expect them locally, not on a
fresh clone.

### Issue tracker

GitHub Issues on `Dillind/pawly-expo`, via the `gh` CLI. See [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md).

### Triage labels

The five canonical roles, unchanged. See [docs/agents/triage-labels.md](./docs/agents/triage-labels.md).

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the root. See [docs/agents/domain.md](./docs/agents/domain.md).

## Domain modelling discipline

This project keeps a live domain model. When you introduce or sharpen a domain term, update [CONTEXT.md](./CONTEXT.md) in the same change. When you make a decision that is hard to reverse, surprising without context, and the result of a real trade-off, add an ADR in `docs/adr/`, numbered from `ls docs/adr/` rather than from memory — see the note at the top. Keep `CONTEXT.md` free of implementation detail — it is a glossary.

## Open questions / known issues

Keep this list honest and current:

- ~~**Auth**~~ — resolved: real Supabase auth, gated with `Stack.Protected` in `src/app/_layout.tsx`.
- ~~**Package manager / lockfile**~~ — resolved: bun, single `bun.lock`. See Toolchain above.
- **Backend:** Supabase (and Sentry/PostHog/RevenueCat/Canny) are decided but **not installed** — see TECH_STACK status column before importing them.
- ~~**Palette**~~ — resolved: CRU-088 landed a warm, light-first palette where gold is a fill. See [ADR 0034](./docs/adr/0034-a-warm-light-first-palette-with-gold-as-a-fill.md).
