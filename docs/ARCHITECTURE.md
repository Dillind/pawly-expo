# Crumpet — Architecture

The shape of the system, not its parts. Library choices and versions are in
[TECH_STACK.md](./TECH_STACK.md); the reasoning behind individual decisions is in
[adr/](./adr/) and [DECISIONS.md](./DECISIONS.md).

---

## The app is a thin client over a Postgres that holds the real logic

This is the single most important thing to understand, and reading `src/` will not tell you.

The Grace Window arithmetic, slot matching, the Double Feed guard and the missed-feed sweep all
live in Postgres — as functions, triggers and cron. The React Native app renders their results.

Two consequences:

- **A feature can be complete in the app and still broken**, because the behaviour lives in SQL the
  app never sees. Jest cannot reach any of it.
- **Changing feeding behaviour usually means a migration, not a component.** Look in
  `supabase/migrations/` before `src/`.

## One direction of data, three layers

```
component  ->  src/hooks/queries/<area>/   ->  src/services/*.service.ts  ->  Supabase
               TanStack Query, cache keys,     the query, and row<->domain
               invalidation, toasts            mapping. No React.
```

The rules that make this hold:

- **`import { supabase }` outside `src/services/` is a bug.** One exception:
  `src/lib/supabase/client.ts`, which creates it.
- **The service owns snake_case.** A column name must never reach a component. `PetService.update`
  takes `birthdateIsApproximate` and writes `birthdate_is_approximate`.
- **Domain types are exported by the service that produces them** — `PetDetail`, `CareCard`,
  `FeedingSlot`.
- **Toasts belong to the query hook, not the call site.** Callbacks passed to `mutate()` are dropped
  if the component unmounts first; the hook's own always run.

## Writing a feed goes through an RPC, and that is what makes notifications work

`log_feed` is the only write path. Never `from('feed_logs').insert(...)`.

It takes a per-pet advisory lock and does the Double Feed check and the insert in one transaction —
two members tapping at once would otherwise both be told there is no collision. It returns
`{ status: 'logged' }` or `{ status: 'double_feed' }`, and in the second case **nothing was
written**.

The part that surprises people: an after-insert trigger on `feed_logs` is what queues the
notification. **A path that bypasses `log_feed` does not merely skip the guard — it silently
notifies nobody.**

## Notifications are an outbox, resolved at send time

```
feed_logs -> trigger -> alerts -> trigger -> pg_net -> send-alerts Edge Function -> Expo Push
```

Anything that needs to notify a household **inserts an `alerts` row**. It does not call the Edge
Function. Recipients are resolved when the alert is sent, not when it is queued, which is what makes
delivery the recipient's choice rather than the sender's — there is no per-log "notify?" control and
there must not be one (ADR 0012).

Push payloads carry a route (`screen: '/household/[postId]'`) in `send-alerts/message.ts`. **Renaming
a route means redeploying that function**, and already-delivered notifications keep the old path.

## Auth is one subscription driving one guard

`useAuthSession` subscribes to Supabase auth **once**, in the root layout, and writes to
`useAuthStore`. Every other "is the user signed in" read goes through the store — never a second
subscription.

`AuthGate` in `src/app/_layout.tsx` turns that status into `Stack.Protected` guards over the
`(public)` and `(protected)` route groups. Navigation between the two halves of the app is therefore
a **side effect of session state**, not a `router.push` — screens that sign a user in or out do no
navigation of their own.

The one deliberate complication is `isRecovering`, which holds the user in `(public)` during a
password reset because verifying a recovery code signs them in before they have chosen a password.
See ADR 0028.

## Routes: file-based, with dynamic segments as folders

```
src/app/
  (public)/(auth)/       signed out
  (protected)/(tabs)/    signed in; native tabs, one Stack per tab
```

Dynamic segments are folders, so one entity's screens sit together —
`home/[petId]/index.tsx` alongside `home/[petId]/care-card-editor.tsx`. The rule, its anti-pattern
and what breaks when a route moves are in **AGENTS.md → Navigation**.

Note that `(tabs)` uses Expo Router **native tabs**, not a JS tab bar. Anything that needs the tab
bar's height cannot read it (`useBottomTabBarHeight` throws outside a JS navigator) — hence the
fixed `BottomTabInset` constant.

## The UI is bespoke, and half of it is native

There is no component library and no Tailwind (ADR 0004). Colours come from `useTheme()`, styles
from a module-level `makeStyles` factory via `useStyles`.

Several surfaces are genuinely native and only *look* like React components: TrueSheet bottom
sheets, the SwiftUI picker in `dropdown-picker-validated.ios.tsx`, native tabs, liquid glass.

**Jest renders mocks of all of them.** A test can pass against a control that is dead on device —
this has already happened. Native surfaces are verified on a device, not in Jest.

## What testing can and cannot see

| Layer | Covered by |
|---|---|
| Pure logic, Zod schemas, row↔domain mapping | Jest (`tests/` mirrors `src/`) |
| SQL: `log_feed`, `slot_states`, grace window, sweep | **nothing yet** — wants pgTAP |
| Native surfaces, navigation, real routes | a device, via Argent |

A route that does not resolve still typechecks. A migration that is wrong still passes CI.
