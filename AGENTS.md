# AGENTS.md

Guidance for AI agents (and humans) working in this repository. `CLAUDE.md` imports this file.

## ⚠️ Read the versioned Expo docs first

Expo changes fast and the model's training data is often stale. This project is on **Expo SDK 57**. Before writing or changing any code that touches Expo/React Native APIs, read the exact versioned docs: **https://docs.expo.dev/versions/v57.0.0/**. `package.json` is the source of truth for versions.

## What this project is

**Pawly** — a pet-care coordination app (iOS first). A household shares responsibility for a pet; members log feeds, everyone gets notified, and the app flags missed feeds. Starts with dog feeding but is intentionally pet-general.

- **Product:** [docs/PRODUCT_BRIEF.md](./docs/PRODUCT_BRIEF.md)
- **Tech stack (with install status):** [docs/TECH_STACK.md](./docs/TECH_STACK.md)
- **Theming:** [docs/THEMING.md](./docs/THEMING.md)
- **Domain language (glossary):** [CONTEXT.md](./CONTEXT.md) — use these exact terms
- **Architecture decisions:** [docs/adr/](./docs/adr/)

Before naming things or discussing the domain, skim `CONTEXT.md`. Before changing architecture, skim the ADRs.

## Commands

```bash
bun start           # Expo dev server (or: expo start)
bun run ios         # Run on iOS simulator
bun run android     # Run on Android emulator
bun run web         # Run on web
bun run lint        # ESLint (eslint-config-expo)
bun run typecheck   # tsc --noEmit
bun run spellcheck  # cspell across ts/tsx/md/sql
```

There is **no test setup yet** (no test runner, no `test` script). Don't assume tests exist; if adding them, set up the runner first and note it here.

## Branches

Every feature or non-trivial change gets a branch, named **before** work starts — never commit
straight to `main`:

```
<type>/PAW-<nnn>-<kebab-case-slug>     e.g. feat/PAW-001-feed-logging
```

`<type>` is the commit-type vocabulary (`feat`, `fix`, `chore`, `docs`, `refactor`); the ticket ID
is uppercase and zero-padded to three digits. Git refnames forbid spaces and `[`, so brackets never
appear in a branch name — only in the PR title (`[PAW-001] Add feed logging`).

IDs come from git history, not an external tracker: `git fetch --all --prune`, then take the highest
existing `PAW-nnn` and add one. Full command and PR conventions live in the `create-pr` skill.

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

### Naming & imports

- **Files and folders are `kebab-case`** (`app-text.tsx`, `use-push-notifications.ts`). Do not introduce `PascalCase`/`camelCase` filenames.
- **Path aliases:** `@/*` → `src/*`, `@/assets/*` → `assets/*` (see `tsconfig.json`). Prefer `@/` imports over deep relative paths.
- Components are typically default-exported; hooks/utilities named-exported (follow the surrounding file).

### Navigation

Expo Router (file-based). Auth is enforced with `Stack.Protected` guards in `src/app/_layout.tsx`; routes are split into `(public)` and `(protected)` groups. The authenticated area uses Expo Router **native tabs** (`expo-router/unstable-native-tabs`), not a JS tab bar. Auth is currently gated by a placeholder `useState(false)` — real Supabase auth is not yet wired.

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
- `Icon` is decorative by default (hidden from the accessibility tree) — it does not accept an `accessibilityLabel`. Icon-only tappable controls should use `IconButton` (owns the tap target and requires a label) once it exists; don't bolt accessibility props onto `Icon` itself.

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
- **Deep links reach sheets via their host screen**, because a sheet has no URL. Route to the screen with a param (`/activity?logId=…`), present from an effect once the data has loaded, then clear the param so back-navigation behaves. This is how notification taps open a specific record.
- Prefer an **inline** picker inside a sheet over `react-native-modal-datetime-picker` — stacking a modal on top of a native sheet is a rough edge on iOS.

### Platform & device

Use `isIOS` / `isAndroid` / `isWeb` from `@/utils/platform`. Use the haptics helpers in `@/lib/haptics` (`hapticLight`, etc.) rather than calling `expo-haptics` directly.

### Notifications

Push handling lives in `use-push-notifications`. Two alert types (feed-logged, missed-feed) — see TECH_STACK and [ADR 0002](./docs/adr/0002-missed-feed-alert-engine.md).

### Localisation

All user-facing text uses **Australian/British English** (colour, organise, cancelled, licence, favourite, grey, "tick" not "check", etc.). Applies to labels, buttons, errors, placeholders, toasts.

### Code style

- Prettier: 100-char width, single quotes, **no trailing commas**, `bracketSameLine: true`, no tabs (`.prettierrc.json`).
- ESLint via `eslint-config-expo` (flat config). Run `bun run lint` before finishing.
- Spelling is checked with cspell (`bun run spellcheck`); add project words to `cspell.json` rather than disabling. The locale is `en,en-GB` deliberately — prose is British (`colour`), but code identifiers are American (`backgroundColor`, `colors`), so both dictionaries have to be active.

### Comments

Don't comment self-explanatory code. Comment the **why** — non-obvious constraints, platform quirks, deliberate deviations. Never use comments to narrate a change.

## Domain modelling discipline

This project keeps a live domain model. When you introduce or sharpen a domain term, update [CONTEXT.md](./CONTEXT.md) in the same change. When you make a decision that is hard to reverse, surprising without context, and the result of a real trade-off, add an ADR in [docs/adr/](./docs/adr/). Keep `CONTEXT.md` free of implementation detail — it is a glossary.

## Open questions / known issues

Keep this list honest and current:

- **Auth:** not implemented — routing uses a placeholder flag; Supabase auth pending.
- ~~**Package manager / lockfile**~~ — resolved: bun, single `bun.lock`. See Toolchain above.
- **Backend:** Supabase (and Sentry/PostHog/RevenueCat/Canny) are decided but **not installed** — see TECH_STACK status column before importing them.
- **Palette:** the proposed brand palette in PRODUCT_BRIEF differs from the neutral palette currently in `theme.ts`; reconcile in a design session.
