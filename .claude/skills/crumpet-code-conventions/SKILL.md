---
name: crumpet-code-conventions
description: Crumpet's architecture and code rules for everything that is not visual — services and unwrap(), generated Supabase types, TanStack Query hooks with queryKeys and mutation meta, error and toast surfaces, react-hook-form + Zod with FormTextInput, Zustand stores, MainLegendList, logging, and when to extract shared code. Invoke before writing or changing any service, hook, store, schema, form logic, list, or shared helper in this repo, and before any refactor. Pair it with /crumpet-ui-conventions when the change is also visible.
---

# Crumpet code conventions

These are strict. Most of them are enforced by ESLint (`eslint.config.js`), the PostToolUse hook
runs ESLint on every file you edit, and CI runs it on every pull request. A rule below marked
**(lint)** will fail your edit. The rest need judgement, and they are why this skill exists.

Before you write a new function, component or hook: **search for the one that already exists.**
`rg` the verb and the noun. Most "new" helpers in this repo turned out to be the third copy.

## Layers

One direction only. A layer never reaches past the one below it.

```
component / screen      renders, owns local UI state, calls hooks
  └ src/hooks/queries/<area>/   useQuery / useMutation, queryKeys, invalidation, meta
      └ src/services/*.service.ts   the Supabase call, row <-> domain mapping, snake_case
          └ supabase                RLS, RPCs, triggers — where most real logic lives
```

- **No Supabase outside `src/services/` (lint).** No React or TanStack inside a service.
- **A service owns snake_case.** A column name never reaches a hook or a component. Domain types
  are exported from the service that produces them.
- **A component never builds a query key, never calls a service, never calls `supabase`.** It
  calls a hook.
- **Business rules belong to Postgres when they must hold for every client** — a check, a cap, a
  permission. The client may mirror a rule for the UI (see `featureRequestPermissions`), but the
  database is the authority.

## Services

```ts
const data = await unwrap(supabase.rpc('list_feature_requests', { sort, page_size: PAGE_SIZE }));
```

- **`unwrap()` from `@/lib/supabase/unwrap`, never `if (error) throw error` (lint).** Map a
  specific error code first, by hand, only when it becomes a `UserFacingError` or a status.
- **Match a Postgres error on `code` or on the exact `message`, never `message.includes(...)`.**
- **The client is typed.** `src/types/database.ts` is generated: run `bun run db:types` after every
  migration and commit it. Use `Tables<'x'>`, `TablesInsert<'x'>` and `TablesUpdate<'x'>` for row
  and patch types — never `Record<string, unknown>`.
- **An RPC's real return type lives in `src/types/database-overrides.ts`.** The generator types
  `jsonb` as `Json` and marks every `returns table` column non-null, so each RPC the app calls has an
  entry there, and the client is typed with the merged `Database`. A service derives its row type
  from it — `type AlertRow = RpcRow<'list_alerts'>`, `Rpc<'request_follow'>['status']` — and
  never casts. A new RPC gets its override in the same change as its migration.
- **Enums come from the database:** `Enum<'pet_sex'>`, never a copied string union.
- A cast is allowed only where no type can say the truth, with a one-line reason — a `tstzrange`
  column the generator types as `unknown`.
- An update that RLS can filter to nothing pairs `.select()` with `assertWrote`.

## Query hooks

- **Every key comes from `queryKeys` in `@/lib/query-keys` (lint).** Add the key there first. A
  key is a prefix of the keys below it, so invalidate the widest key that is correct, once.
- **A mutation declares its toasts in `meta`**, and the `MutationCache` in `@/lib/query-client`
  shows them and logs the error. The hook keeps only its own logic: optimistic writes, rollback,
  invalidation.

  ```ts
  return useMutation({
    meta: { successMessage: SuccessMessage.PetAdded, errorMessage: ErrorMessage.PetAddFailed },
    mutationFn: PetService.add,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.all })
  });
  ```

  Call `showSuccessToast` or `showErrorToast` by hand only when the message depends on the result
  (a status the RPC returned). **Never** add an `onError` toast at the `mutate()` call site of a
  mutation that has `meta` — the user sees two.
- A `UserFacingError` thrown from a service becomes the toast title on its own. Throw one when the
  failure has a message a person can act on.
- **Destructure and rename:** `const { mutate: deletePet, isPending: isDeleting } = useDeletePet()`.
- Optimistic update: `onMutate` cancels the key and writes; `onError` rolls back; `onSettled`
  invalidates. Do not skip the rollback.

## Errors and logging

- **No `console` (lint).** `logError(error)` from `@/lib/errors` is the one logging seam, so Sentry
  can attach in one place later.
- Validation → inline under the field. API failure → error toast. Success → success toast, except a
  switch that shows its own state. A decision that must be made now → `Alert.alert`. See AGENTS.md.
- Never show a raw Supabase or Postgres message to a person.

## Forms

- **Zod schema in `src/constants/schemas/`**, inferred type exported beside it, resolver on
  `useForm`. The schema is the only validation contract.
- **A text field is `FormTextInput` (lint).** `parse` changes the text before it is stored.
  `<Controller>` is for inputs that are not text.
- **Read a value with `useWatch`, never `watch()` (lint).** Do not `useWatch` a field only to pass
  its value back into the same field — `FormTextInput` already has it.
- A multi-step flow shares one `useForm` in the flow's `_layout.tsx` through `FormProvider`; each
  step uses `useFormContext`. Leaving the flow goes through `useLeaveModalFlow`.

## State

- **Server data lives in TanStack Query, never in Zustand.** Zustand holds client state that
  outlives a screen: the active household, the theme, the session.
- **A store types `State` and `Action` apart** and is created as `create<State & Action>()`.
- **Consume with a plain destructure, never a selector function (lint).** See AGENTS.md > State.
- Local UI state is `useState`. A value derived from props or a query is computed in render,
  never mirrored into state with an effect.

## Lists

- **Every scrolling list is `MainLegendList` (lint).** No `FlatList`, `SectionList` or
  `FlashList`; `@legendapp/list` is imported for types only.
- `keyExtractor` returns a stable id. `renderItem` is wrapped in `useCallback` when it closes over
  state, and `extraData` names that state.

## Components and React 19

- **`ref` is a prop. No `forwardRef` (lint).**
- Icons through `<Icon>`, haptics through `@/lib/haptics`, toasts through `@/lib/toast` (lint).
- A component that grows past about 250 lines, or holds more than one form or more than one
  mutation flow, is split: pure logic to `src/lib` or `src/utils`, a sub-view to its own file.

## When to extract (DRY), and when not to

- **Two copies is a warning, three is a refactor.** Extract on the third, or on the second when
  the two must stay identical to be correct (two menus for one entity, two exits from one flow).
- **Extract rules, not markup.** When two screens show the same actions, share the permission
  function and the handlers (`useFeatureRequestActions`), and let each screen draw its own menu.
- **Do not extract across a domain boundary** only because two functions look alike today. A
  shared helper that grows `if (kind === ...)` branches is worse than the copies.
- Pure logic goes in a plain function with a unit test in `tests/` — not inside a hook.

## Comments (lint)

No JSDoc, no banners, no TODO without `TODO(CRU-123)`, and no block over three lines. A reason
that needs more is a `DECISIONS.md`, `KNOWLEDGE.md` or ADR entry. See AGENTS.md > Comments.

## Before you hand over

1. `bun run check` passes. The Stop hook runs it too.
2. A visible change is verified on the simulator with Argent — Jest renders mocks.
3. A new domain term is in `CONTEXT.md`; a trap you hit is in `KNOWLEDGE.md`.
