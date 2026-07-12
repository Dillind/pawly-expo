# Pawly — Tech Stack

> Status legend: **Installed** = in `package.json` and wired up · **Scaffolded** = present but not fully implemented · **Planned** = decided, not yet added.
> Source of truth for versions is always `package.json`. This project runs **Expo SDK 57** (React Native 0.86, React 19.2). Read the exact v57 docs at https://docs.expo.dev/versions/v57.0.0/ before writing code.

---

## Platform

Mobile app — iOS first, Android to follow. Built with Expo (React Native) + Expo Router. Web target is enabled (`web.output: 'server'`) but iOS is the priority.

---

## Core Stack

| Layer | Choice | Status | Rationale |
|---|---|---|---|
| Framework | Expo SDK 57 (RN 0.86, React 19.2) | Installed | Current SDK; EAS handles build/deploy |
| UI components | `@expo/ui` + Expo Router native tabs (`unstable-native-tabs`) | Installed | Native-feeling iOS components; see [ADR 0004](./adr/0004-custom-theme-no-component-library.md) — no component library |
| Styling | Custom theme tokens (`src/constants/theme.ts`) via `useTheme()` / `useThemedStyles()` | Installed | Bespoke native feel; **no NativeWind/Tailwind**. See THEMING.md and ADR 0004 |
| Routing | Expo Router (file-based, route groups, `Stack.Protected` guards) | Installed | Idiomatic Expo; `(public)` vs `(protected)` groups |
| State: local | `useState` / `useReducer` | Installed | Component-level state |
| State: global | Zustand | Installed | Lightweight, no boilerplate |
| State: server | TanStack Query | Installed | Caching, background refresh, loading/error states for all remote data |
| Forms | `react-hook-form` + Zod (`@hookform/resolvers`) | Installed | Zod v4 schemas as the single validation contract |
| Lists | `@legendapp/list` | Installed | Virtualised lists (activity feed / history) |
| Dates | `dayjs` | Installed | Timestamp formatting |
| Toasts | `sonner-native` | Installed | Configured in root layout |
| Icons | `phosphor-react-native` + `react-native-svg` | Installed | Native SVG icons; use `size` prop, not `width`/`height` |
| Haptics / media | `expo-haptics`, `expo-image`, `expo-image-picker`, `expo-camera` | Installed | Micro-interactions and pet photos |
| Notifications | `expo-notifications` | Installed | Feed-logged + missed-feed pushes (see `usePushNotifications`) |
| Secure storage | `expo-secure-store` | Installed | Token/session storage |
| Auth toolkit | `expo-auth-session`, `expo-crypto`, `expo-web-browser` | Installed | Present, but **v1 uses email/password only** (OAuth is v2) |
| Debugging | `reactotron-react-native` | Installed | Dev-only, loaded in root layout when `__DEV__` |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) | **Planned** | Covers every v1 requirement without a custom server; client not yet added |
| Payments | RevenueCat | **Planned** | Initialise in v1, paywall off until v2 |
| Analytics | PostHog | **Planned** | Retention cohorts, weekly-active tracking |
| Crash reporting | Sentry | **Planned** | Wire in early |
| Feature voting | Canny | **Planned** | Surfaced in settings |
| Deployment | EAS Build / Update / Submit | Planned | Standard Expo pipeline; `eas.projectId` not yet set in `app.config.ts` |

### Known open technical decisions

- **Auth:** `app/_layout.tsx` currently gates routes with a hard-coded `useState(false)`. Real auth (Supabase) is not yet implemented.

---

## Supabase Services (planned)

| Service | Usage |
|---|---|
| Postgres | Core data — see data model below |
| Auth | Email/password in v1. Apple + Google OAuth in v2 (Apple Sign-In becomes mandatory once any OAuth is added on iOS) |
| Realtime | Live feed-log updates across household members |
| Storage | Pet profile photos |
| Edge Functions | Missed-feed alert cron — see Notifications Architecture and [ADR 0002](./adr/0002-missed-feed-alert-engine.md) |

---

## Data Model (high level)

Reflects [ADR 0001](./adr/0001-household-owns-pets-role-based-ownership.md): a household owns many pets, and ownership is a member **role** (no `owner_id` on pets).

```
users
  id, email, display_name, avatar_url, created_at

households
  id, name, timezone, grace_window_minutes (default 60), created_at

household_members
  id, household_id (→ households), user_id (→ users), role (owner | contributor), created_at
  -- multiple owners allowed

household_invites
  id, household_id (→ households), code, created_by (→ users), expires_at, revoked_at, redeemed_by, created_at

pets
  id, household_id (→ households), name, breed, birthdate, birthdate_is_approximate, photo_url, created_at

feeding_schedules
  id, pet_id (→ pets), scheduled_time (wall-clock time, interpreted in household.timezone),
  label (morning | lunch | dinner | custom)

feed_logs
  id, pet_id (→ pets), logged_by (→ users), logged_at (timestamptz, backdatable),
  notes, created_at
  -- contributors may edit/delete only their own recent logs; owners any
```

Row-level security keys off **household membership**, not pet ownership.

---

## Typing Strategy

Supabase CLI generates TypeScript types from the Postgres schema:

```bash
supabase gen types typescript --project-id your-project > src/types/database.types.ts
```

Edge Functions use **Zod** schemas for input/output validation (runtime safety + TS inference) as the contract between the app and Edge Functions. No Swagger/OpenAPI in v1; revisit only if the API surface grows significantly.

---

## Notifications Architecture

| Type | Trigger | Delivery |
|---|---|---|
| Feed Logged Alert | A member logs a feed | Immediate push to all household members via Expo Notifications |
| Missed Feed Alert | Cron Edge Function detects a Scheduled Time with no satisfying Feed Log within the Grace Window | Push to all household members |

The cron Edge Function runs on a schedule (e.g. every 15 min), evaluates each pet's `feeding_schedules` (interpreted in `household.timezone`) against recent `feed_logs` using `logged_at`, and fires an alert when `now > scheduled_time + grace_window` with no satisfying log. See [ADR 0002](./adr/0002-missed-feed-alert-engine.md). This is **technical spike #1** — build it first.

---

## Third-Party Services (planned)

| Service | Purpose |
|---|---|
| PostHog | Product analytics, retention, weekly-active users |
| Sentry | Crash reporting and error monitoring |
| Canny | In-app feature requests and voting (settings) |
| RevenueCat | Subscriptions/entitlements (initialised v1, activated v2) |

---

## Deployment & CI

| Layer | Choice | Status |
|---|---|---|
| Mobile builds | EAS Build | Planned |
| OTA updates | EAS Update | Planned |
| App Store submission | EAS Submit | Planned |
| CI | None in v1 — add GitHub Actions lint/typecheck gates when there's something worth protecting | Planned |

---

## Technical Spikes (do these first)

1. **Supabase Edge Function cron (Priority 1)** — a scheduled function that reads Postgres and fires a push. Least-familiar part of the stack; underpins missed-feed alerts. See ADR 0002.
2. **Expo Notifications on a real device** — APNs delivery is not representative on the simulator. Test on hardware early.
3. **`@expo/ui` component coverage** — SDK 57 Expo UI is new. Audit available components against UI requirements; know early where a custom implementation is needed.

---

## v2 Stack Additions (planned)

| Addition | Reason deferred |
|---|---|
| Apple Sign-In + Google OAuth | Certificate overhead; not needed for v1. Both must ship together (App Store rules) |
| RevenueCat paywall activation | Validate the free tier first |
| Multiple pets in UI | Schema already supports it; UI/paywall deferred |
