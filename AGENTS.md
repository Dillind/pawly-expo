# AGENTS.md

Guidance for AI agents (and humans) working in this repository. `CLAUDE.md` imports this file.

## ⚠️ Read the versioned Expo docs first

Expo changes fast and the model's training data is often stale. This project is on **Expo SDK 57**. Before writing or changing any code that touches Expo/React Native APIs, read the exact versioned docs: **https://docs.expo.dev/versions/v57.0.0/**. `package.json` is the source of truth for versions.

## What this project is

**Crumpet** — a pet-care coordination app (iOS first). A household shares responsibility for a pet; members log feeds, everyone gets notified, and the app flags missed feeds. Starts with dog feeding but is intentionally pet-general.

- **Product:** [docs/PRODUCT_BRIEF.md](./docs/PRODUCT_BRIEF.md)
- **Tech stack (with install status):** [docs/TECH_STACK.md](./docs/TECH_STACK.md)
- **Theming:** [docs/THEMING.md](./docs/THEMING.md)
- **Domain language (glossary):** [CONTEXT.md](./CONTEXT.md) — use these exact terms
- **Architecture decisions:** [docs/adr/](./docs/adr/)

Before naming things or discussing the domain, skim `CONTEXT.md`. Before changing architecture, skim the ADRs.

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

```bash
bun start           # Expo dev server (or: expo start)
bun run ios         # Run on iOS simulator
bun run android     # Run on Android emulator
bun run web         # Run on web
bun run lint        # ESLint (eslint-config-expo)
bun run typecheck   # tsc --noEmit
bun run spellcheck  # cspell across ts/tsx/md/sql
bun run test        # Jest, single run
bun run test:watch  # Jest, watch mode
bun run check       # all four above, in order, stopping at the first failure

bun run build:dev         # EAS development build, iOS (simulator-capable)
bun run build:preview     # EAS preview build, iOS
bun run build:production  # EAS production build, iOS (build only, no submit)
bun run testflight        # EAS production build, iOS, auto-submitted to TestFlight
```

The build scripts always name a profile, deliberately. A bare `eas build` defaults to
**production**, whose EAS environment holds no variables, so the build dies at
`src/lib/supabase/client.ts` with "Missing EXPO_PUBLIC_SUPABASE_URL or
EXPO_PUBLIC_SUPABASE_KEY". Only the `development` environment is populated — `.env` is
gitignored and never reaches the builder, so anything the app reads from
`process.env` has to exist as an EAS environment variable too (`eas env:list`).

### TestFlight

**`preview` cannot reach TestFlight.** It is `distribution: "internal"` — an ad hoc build for
registered device UDIDs, installed from a link. TestFlight takes **store** builds only, which is
what `production` is. Use `preview` to put a build on a device without waiting for App Store
processing; use `testflight` for anything a real tester should see.

**TestFlight is not a build type, it is the doorway.** Every store build lands there first, and an
App Store release promotes a build already in TestFlight. Same binary, so never rebuild "for
release" — submit the build that was tested.

`--auto-submit` runs the submit profile **whose name matches the build profile**, so
`--profile production` uses `submit.production`.

**`submit.production` is empty on purpose.** EAS owns the Apple credentials: on the first submit it
signs in to Apple and keeps an App Store Connect API Key on its servers (`eas credentials -p ios` to
inspect or reset). Every submit after that is non-interactive with no config at all. The
`appleId` / `ascAppId` / `appleTeamId` and `ascApiKey*` fields exist for CI runners and for juggling
several Apple accounts — putting them here otherwise duplicates what EAS already knows, and hardcodes
an id that only fails once the build has finished.

To skip the sign-in prompt without committing anything, export `EXPO_APPLE_ID` and
`EXPO_APPLE_TEAM_ID`. The CLI prints the team id on the first run.

**The App Store Connect app record must exist before the first submit.** EAS does not create it.
Without one the submit fails with _"No suitable application records found"_, and the bundle
identifier has to match `au.com.crumpet.ios` exactly.

**Internal testers are the fast path.** Up to 100, no review, the build is available as soon as
Apple finishes processing it. External testers (up to 10,000) need one Beta App Review, roughly a
day, and only for the first build. So a build for one or two people to try is an internal-tester
build and involves no review at all.

`autoIncrement` on the production profile with `appVersionSource: "remote"` is what stops a build
being rejected for reusing a build number. Don't hand-set `buildNumber` in `app.json`.

A **`qa` profile is deliberately absent.** The qa/production split is two _store_ builds pointing at
two _backends_, both going through TestFlight — it earns its keep once a non-production Supabase
project exists, and not before. Adding one now means a second binary on the same database.

No Android build scripts until FCM credentials exist.

## Tests

`jest-expo` + `@testing-library/react-native`. **Run `bun run check` before finishing** — it is
typecheck, lint, spellcheck and test in one, and stops at the first failure.

Tests live in a top-level **`tests/` mirroring `src/`**, so the path tells you what is covered:

```
tests/lib/dates.test.ts              covers  src/lib/dates.ts
tests/services/pet.service.test.ts   covers  src/services/pet.service.ts
```

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

IDs come from git history, not an external tracker: `git fetch --all --prune`, then take the highest
existing `PAW-nnn` **or** `CRU-nnn` and add one — matching only `CRU-` would restart at 001. Full
command and PR conventions live in the `create-pr` skill.

## Toolchain

- **Package manager: bun.** `bun.lock` is the only lockfile; `package-lock.json` was deleted (it was stale and still listed the removed `phosphor-react-native`). Don't reintroduce npm/yarn/pnpm lockfiles — `packageManager` in `package.json` pins the version.
- **Node: 24**, pinned with [Volta](https://volta.sh) (`volta.node` in `package.json`). Install Volta once (`curl https://get.volta.sh | bash`) and the correct Node is selected automatically inside this repo — no `nvm use`, and it works in non-interactive shells, CI, and agent tool calls, which is precisely where `.nvmrc` silently does nothing. `.nvmrc` is kept for anyone still on nvm; the two must be bumped together.
- The `engines` floor is 22.18.0 because `cspell` requires it — on Node 20 the spelling gate doesn't just fail, it cannot run at all, so `bun run spellcheck` exits non-zero for a reason that has nothing to do with spelling.

## Adding dependencies

Always use **`bunx expo install <package>`** so the version matches SDK 57. Do not hand-pick versions with a raw `bun add` for Expo-ecosystem packages.

## Project layout

```
docs/                         # All non-code documentation
├── PRODUCT_BRIEF.md
├── TECH_STACK.md
├── THEMING.md
└── adr/                      # Architectural decision records
    ├── 0001-household-owns-pets-role-based-ownership.md
    ├── 0002-missed-feed-alert-engine.md
    ├── 0003-invite-via-shareable-link.md
    └── 0004-custom-theme-no-component-library.md

src/
├── app/                      # Expo Router routes (file-based)
│   ├── _layout.tsx           # Root: providers + Stack.Protected auth guard
│   ├── (public)/(auth)/      # Unauthenticated screens (login, forgot-password)
│   └── (protected)/(tabs)/   # Authenticated screens; native tabs (home, profile)
├── components/
│   ├── core/                 # Shared primitives (AppText, MainButton, inputs, ...)
│   └── ui/                   # Larger composed UI pieces
├── constants/                # theme.ts (tokens), enums, primitives
├── hooks/                    # use-theme, use-styles, use-push-notifications, ...
├── lib/                      # haptics, styles/shadows, form/ helpers
├── utils/                    # platform, linking, external-link
└── types/                    # shared TS types (core.ts); database.types.ts (generated, planned)
```

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

`Alert.alert` from `react-native`, which is `UIAlertController` on iOS. There is no wrapper — the
platform component is the component.

Apple's [Alerts guidance](https://developer.apple.com/design/human-interface-guidelines/alerts) is
the rule here, and the parts that decide the call are:

> "An alert gives people critical information they need right away."
>
> "Alerts give people important information, but they interrupt the current task to do so."
>
> "Use an action sheet — not an alert — to offer choices related to an intentional action."

So, in this codebase:

**Use an alert when all of these hold.** Miss any one and it is the wrong surface.

1. **It reports something the user did not know**, discovered while carrying out what they asked
   for — a collision, a destructive consequence, an irreversible step.
2. **It is a response to an action, not a stage of one.** The user has already tapped the thing;
   the app is interrupting. A question you always ask on the way through a flow is a step, not an
   alert.
3. **Two buttons is enough**, one of which is Cancel. Three is the hard ceiling and already a sign
   the answer is a different surface.
4. **The whole message fits in one short sentence.** If the explanation needs a paragraph, or the
   options need explaining individually, the alert cannot carry it.

**Never use an alert** for a routine undoable action, for anything merely informative (that is a
toast), for a validation error (that is inline), or to offer a choice between options that each
need explaining — Apple sends that to an action sheet, and if the options need text _underneath_
them, neither works and it becomes a step in a `Tray`.

**Writing them:**

- **Title**: specific and complete, no verb needed — "Already logged", "Delete this photo?". Not
  "Warning", not "Are you sure?".
- **Message**: optional, and only if it adds something the title cannot. One sentence naming the
  facts the decision turns on — who, what, when.
- **Buttons**: name the action, never "OK" — "Log anyway", "Delete", "Remove". The cancelling
  button is always titled exactly **"Cancel"** and always carries `style: 'cancel'`, which is what
  makes iOS render it as the emphasised, safe default.
- **`style: 'destructive'`** is for losing data, not merely for the consequential choice. Writing a
  duplicate Feed Log is not destructive; deleting a Pet is.
- **Emphasis is `isPreferred`, not colour.** A native alert takes no theme tokens — iOS draws it,
  and `AlertButton` offers only the three `style` values plus `isPreferred`, which maps to
  `UIAlertController.preferredAction` and renders that button **bold**. That is the whole of
  primary-versus-secondary here. Put it on **Cancel** whenever the other button has a consequence,
  so the consequential one has to be chosen rather than fallen into. If a decision genuinely needs
  branded buttons, that is the signal it was never an alert — build it as a `Tray` step.

Live examples: the Double Feed collision in `use-log-flow.ts`, removing a Pet in
`home/pet/[petId].tsx`, deleting a photo in `gallery-strip.tsx`. The counter-example worth reading
is `late-feed-step.tsx` — it asks a question and is deliberately **not** an alert, because each of
its two options needs a sentence of consequence underneath it (ADR 0016).

Toasts go through `@/lib/toast` (`showSuccessToast`, `showErrorToast`, `showInfoToast`) — never
import `toast` from `sonner-native` outside that file. The optional second argument is a
description; use it only for text a user can act on. Do **not** pass a raw `error.message` from
Supabase or Postgres into it: `new row violates row-level security policy` is a developer string,
and showing it is worse than showing nothing.

That does not mean discarding the error. A service that has already _translated_ a failure into
copy — "There is already a dinner feed. Edit that one instead." — throws
**`UserFacingError`** (`@/lib/errors`), and `userFacingMessage(error, fallback)` unwraps it: the
service's own words when it wrote them for a person, the fallback for anything else. Ignoring the
error entirely is the mistake in the other direction: it throws away the one message that told the
user what to do about it.

**Every `onError` also does `console.error(error)`.** The toast is sanitised copy by design, so the
driver's real message — the SQLSTATE, the constraint name, the network failure — survives nowhere
else.

**The message itself comes from `SuccessMessage` / `ErrorMessage` in `@/constants/enums`**, never a
string literal at the call site. One file holds every sentence the app can say, so wording stays
consistent and changing it is one edit. Entries are named by subject and outcome
(`PetDetailsUpdated`, `FeedTimeRemoveFailed`) and read "&lt;Subject&gt; &lt;past-tense verb&gt;" — five
near-identical trays on the pet screen must not all confirm with the same sentence, because the
toast is the only thing telling a member which sheet they just saved. A message that genuinely
needs a runtime value (`Logged a feed for ${pet.name}`) is the exception, not the excuse.

**The toast belongs to the hook, not the call site.** Put a plain `onSuccess`/`onError` in
`useMutation`. The call site then passes only the mutation's own arguments, and keeps an
`onSuccess` only for something the hook cannot do — dismissing a sheet, calling `onDone()`,
navigating:

```tsx
// In the hook
return useMutation({
  mutationFn: (patch: PetPatch) => PetService.update(petId, patch),
  onSettled: () => invalidate(queryClient, petId),
  onSuccess: () => showSuccessToast(SuccessMessage.PetDetailsUpdated),
  onError: (error) => {
    console.error(error);
    showErrorToast(ErrorMessage.PetDetailsUpdateFailed);
  }
});

// At the call site
updatePet(patch, { onSuccess: onDone });
```

This is not only about repetition. **Callbacks passed to `mutate()` are dropped when the component
unmounts before the mutation settles** — see `hasListeners()` in
`@tanstack/query-core/.../mutationObserver.js`. A long upload on a screen the user navigates away
from would otherwise fail silently. The hook's own callbacks always run.

Both callbacks receive the variables as their second argument, which is how the add-vs-update split
is made: `onSuccess: (_data, input) => showSuccessToast(input.id ? FeedTimeUpdated : FeedTimeAdded)`.

**A hook with two call sites that need different wording takes the messages as an argument.**
`useUpdatePet(petId, { success, failure })` is the only one — "Pet details updated" is not
"Bio updated".

Exceptions worth knowing:

- **`useLogFeed` keeps its toasts at the call site.** A `double_feed` result is a _success_ that
  must not confirm anything, because nothing was written.
- A success toast is redundant where navigation already confirms the result (sign-up moves to the
  verify screen), and `PushTokenService.register` deliberately stays silent — see the comment in
  `use-push-notifications.ts`.

### Writing a feed log

**A feed log is created only through the `log_feed` RPC** — never `supabase.from('feed_logs').insert(...)`. The Double Feed check and the insert happen in one transaction, so a check issued as its own round trip could tell two members at once that there is no double feed and let both of them write. The RPC also takes a per-pet advisory lock, because sharing a transaction alone does not serialise them — two concurrent callers would otherwise each derive their answer from a snapshot taken before the other's insert.

`log_feed` returns either `{ status: 'logged' }` or `{ status: 'double_feed' }`, and in the second case **nothing was written** — calling again with `confirmed: true` writes unconditionally. Corrections and deletes still go through the table under the narrow column grants; only creation moved.

### Theming

`useTheme()` returns `{ colors, isDark, spacing }`. For StyleSheets, define a module-level `makeStyles` factory and call `useStyles(makeStyles)` inside the component. See [docs/THEMING.md](./docs/THEMING.md).

### Forms

`react-hook-form` + **Zod** (`@hookform/resolvers`). Use the shared validated inputs in `src/components/core/` (e.g. `TextInputValidated`, `DatePickerValidated`) which read from `useFormContext` and render `FieldError`. No ad-hoc controlled inputs. Zod schemas are the single validation contract (also used by Edge Functions).

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

`glass` is the one variant that does not use `PressableOpacity`: it renders a `GlassView` with `isInteractive`, so the material itself provides the press response. Layering the usual opacity fade on top would fight it — see [ADR 0011](./docs/adr/0011-liquid-glass-progressive-enhancement.md), which also requires the `hasGlass` fallback the variant already carries — below iOS 26 it drops back to the opaque `PressableOpacity` path, because there is no material to deform.

**Adding a new icon:**

1. Check the icon exists at [lucide.dev/icons](https://lucide.dev/icons).
2. Add one line to `src/constants/icon-map.ts`: a semantic key (not necessarily Lucide's own export name — e.g. `caretDown` maps to Lucide's `ChevronDown`, matching this codebase's existing vocabulary) mapped to the Lucide component.
3. Use `<Icon name="yourNewKey" />` at the call site.

Never import from `lucide-react-native` anywhere except `icon-map.ts` — that's what keeps the bundle from silently growing as icons get added. See [ADR 0008](./docs/adr/0008-lucide-icon-library-typed-icon-map.md) for why Phosphor was replaced.

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

**Delivery is the recipient's decision, never the sender's.** There is no per-log "notify?" control and there must not be one — see ADR 0012. A feed logged more than 30 minutes after it happened is recorded as a Suppressed Alert and not pushed, automatically.

**Sending is an outbox, not a direct call.** `feed_logs` → trigger → `alerts` → trigger → `pg_net` → the `send-alerts` Edge Function, which resolves recipients at send time. Anything that needs to notify a household inserts an `alerts` row; it does not call the Edge Function.

### Localisation

All user-facing text uses **Australian/British English** (colour, organise, cancelled, licence, favourite, grey, "tick" not "check", etc.). Applies to labels, buttons, errors, placeholders, toasts.

### Code style

- Prettier: 100-char width, single quotes, **no trailing commas**, `bracketSameLine: true`, no tabs (`.prettierrc.json`).
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
- **Palette:** the proposed brand palette in PRODUCT_BRIEF differs from the neutral palette currently in `theme.ts`; reconcile in a design session.
