# Alerts

Extracted from `AGENTS.md` so it loads only when you write an alert. The rule
that stays always-loaded is the one-line version in `AGENTS.md`.

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
`edit-pet-details.tsx`, deleting a photo in `gallery-strip.tsx`. The counter-example worth reading
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
