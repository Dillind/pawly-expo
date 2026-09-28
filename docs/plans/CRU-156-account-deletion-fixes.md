# CRU-156 — Account settings: fixes after review

Branch: `feat/CRU-156-account-settings` (PR #234). Design:
https://claude.ai/artifact/U6vJX4CsuzMoXZa4h9hsqM. Research:
`docs/research/account-deletion-apple-google.md`.

Read `AGENTS.md`, `docs/KNOWLEDGE.md` and invoke `/crumpet-code-conventions`,
`/crumpet-ui-conventions`, `/frontend-design`, `/expo-native-ui` and `/expo:expo-router`
before you start. Run `bun run check` after each task.

## Decisions (made by the product owner, 2026-09-24)

1. A deleted account's **posts, comments and likes are deleted**. Feed Logs, Reminders and
   alerts stay with a null author.
2. **Handover is in this PR.** An only Owner picks a successor or deletes the Household
   inside the delete flow.
3. **No billing notice.** RevenueCat is not installed.
4. **Everyone signs in again before a delete.** Apple and Google through their native
   sheets, email users with their password.
5. **Apple token revocation is best effort.** A failed revoke is logged and the delete
   continues. The user must always be able to leave.

## Task 0 — Rebase and renumber

1. Rebase the branch on `main`.
2. Rename the ADR to the next free number from `ls docs/adr/` (0045 at the time of
   writing). Fix every reference to "ADR 0044" in the PR.
3. Update the ADR for decisions 1, 2, 4 and 5.

## Task 1 — Know the sign-in method

The app must know how the user signed in. Read it from the session:
`session.user.app_metadata.provider` (`email`, `apple` or `google`), and
`app_metadata.providers` for a linked account.

- Add `AuthService.signInMethod(): 'email' | 'apple' | 'google'`. If `providers` holds more
  than one value, prefer `apple`, then `google`, because a password alone cannot revoke a
  provider token.
- Add a hook in `src/hooks/queries/account/` that exposes it.

## Task 2 — Account settings screen (design board 1)

- `email` users: rows Name, Email, Update password. Then Delete account.
- `apple` and `google` users: rows Name, Email, then a read-only row "Sign-in" with
  the value "Apple" or "Google". **No Update password row.**
- An Apple relay address shows as "Hidden by Apple".

## Task 3 — Update password (board 3)

- Add a **Current password** field above New password.
- Check it on the client with `supabase.auth.signInWithPassword({ email, password })`
  in `AuthService.verifyPassword`. On failure, show "That password is not right" inline
  on that field (`setError`). This is a validation error, not a toast.
- Button text: "Update password".
- Move the toasts in `use-update-password.ts` to `meta: { successMessage, errorMessage }`.

## Task 4 — Name (board 2)

- Make `lastName` optional in `nameSchema` for this sheet. Apple does not always give a
  last name. Check every other user of `nameSchema` first: if sign-up needs it required,
  make a separate schema.
- Remove the "Enter your last name" error path for the empty case.

## Task 5 — Database migration

New migration. Then run `bun run db:types`.

1. `posts.author_id`: change `on delete set null` to `on delete cascade`.
2. The comments table author column: same change. Keep the column nullable.
3. Likes already cascade — confirm, do not change.
4. `prepare_account_deletion` also returns `storage_path` values from `post_photos` for
   **every post the user wrote in every Household**, not only in deleted Households.
   Postgres cannot delete from `storage.objects`, so the Edge Function removes them.
5. Replace `account_deletion_blockers` output with objects:
   `[{ id, name, handle, is_listed, members: [{ user_id, first_name, role, joined_at }] }]`,
   so the handover step can show candidates without another query. Keep it
   `security definer`, callable by `authenticated`, reading only `auth.uid()`.
6. Add `account_households()` for step 1 of the Tray: every Household the user is in,
   with `outcome`: `deleted` (only member), `leave` (another Owner exists) or
   `choose` (only Owner, others remain).

The handover itself **reuses `set_member_role`** to make the successor an Owner. It
already checks the caller is an Owner and already alerts the new Owner. After the
promotion, the user who leaves is no longer the only Owner, so the delete passes.

Decide in the ADR whether handover also unlists the Household (`is_listed = false`), as
board 5 says. If yes, do it in the same RPC call as the promotion — add
`public.hand_over_household(household_id, successor_id)` that calls the promotion and
the unlist in one transaction.

## Task 6 — Edge Function `delete-account`

Request body: `{ confirmation, provider, authorizationCode? }`.

1. Read the user from the JWT, as now.
2. Check the phrase, as now.
3. `prepare_account_deletion`, as now.
4. If the user's provider is `apple`:
   1. Require `authorizationCode`. If missing, return `{ status: 'reauth_required' }`.
   2. Build the client secret: an ES256 JWT, header `kid` = `APPLE_KEY_ID`; claims
      `iss` = `APPLE_TEAM_ID`, `iat` = now, `exp` = now + 5 min, `aud` =
      `https://appleid.apple.com`, `sub` = the bundle ID. Sign with `APPLE_PRIVATE_KEY`.
      Use `jose` from npm.
   3. POST `https://appleid.apple.com/auth/token` with `grant_type=authorization_code`.
   4. Check the returned `id_token` `sub` equals the Apple identity's `provider_id` in
      `user.identities`. If not, return 403. This stops one Apple ID revoking another.
   5. POST `https://appleid.apple.com/auth/revoke` with the refresh token,
      `token_type_hint=refresh_token`.
   6. **If step 3 or 5 fails, log it and continue.** (Decision 5.)
5. Remove the storage objects, as now, plus the post photos from task 5.
6. `auth.admin.deleteUser`.

New secrets, set by the product owner: `APPLE_TEAM_ID`, `APPLE_KEY_ID`,
`APPLE_PRIVATE_KEY` (the whole `.p8` text), `APPLE_BUNDLE_ID`. Set them on crumpet-qa
first. Pure helpers (client-secret claims, identity match) go in their own module with
Jest tests under `tests/functions/delete-account/`.

## Task 7 — App: re-authentication

In `AuthService.deleteAccount(confirmation)`:

- `email`: the Tray's last step has a password field. Call `verifyPassword` first. On
  failure, show the inline error and stop.
- `apple`: call `AppleAuthentication.signInAsync()` with no scopes. Send its
  `authorizationCode` at once — it expires after 5 minutes. If the user cancels
  (`ERR_REQUEST_CANCELED`), stop quietly with no toast.
- `google`: call `GoogleSignin.signIn()` to confirm it is them, then
  `GoogleSignin.revokeAccess()` after the function returns `deleted`. A cancel stops
  quietly.

## Task 8 — Delete Tray (boards 4, 5, 6, 7)

Build it as a Tray, following `/crumpet-ui-conventions`. Steps:

1. **Households** (board 4). One row per Household with its outcome: "Deleted",
   "You leave" or "Choose". Continue.
2. **Only Owner** (board 5). Shown only when an outcome is `choose`, one page per such
   Household. Options: "Make {name} the Owner" for each member, and "Delete {household}".
   Continue runs `hand_over_household` or marks the Household for deletion.
   A Household marked for deletion is deleted by `prepare_account_deletion` — extend it
   to accept `households_to_delete uuid[]`, and check again that the caller is its only
   Owner.
3. **Confirm** (board 6 for email, board 7 for Apple and Google). The "Deleted" and
   "Kept, with no name" lines from the design. Then:
   - email: Your password, then Type delete my account. Button "Delete account",
     destructive, enabled when both are filled.
   - Apple: the phrase, then a black "Continue with Apple to delete" button.
   - Google: the phrase, then "Continue with Google to delete".

No `Alert.alert` — the typed phrase is the confirmation (ADR 0040).

Update "Deleted" copy to: "your account, your photo, and your posts, comments and likes."

## Task 9 — Success after the screen unmounts

The per-call `onSuccess` in `mutate(…, { onSuccess })` does not run after the component
unmounts, and the sign-out unmounts it. Move the success toast into the hook's own
`onSuccess` (or `meta.successMessage` if `meta` can be status-aware). Do the sign-out
**after** the toast and `clearActiveHousehold`. Confirm on a device that the toast shows
on the sign-in screen (board 8).

## Task 10 — Smaller fixes

- Blockers are loaded before the sheet opens (prefetch on the row's press), so the body
  does not flicker between form, spinner and blocker.
- If the blockers query fails, show an error state with Retry, not the form.
- Remove the `// ... (ADR 0040)` number from code comments, or keep one line with no
  number.

## Task 11 — Docs

- `CONTEXT.md`: add **Handover** if it is a new term.
- `KNOWLEDGE.md`: "Supabase never revokes a Sign in with Apple token. The delete-account
  function does it, with a fresh authorization code." Also the unmount trap in task 9.
- `DECISIONS.md`: decision 5 in two sentences.

## Verify (QA project, `bun run start:qa`)

Use Argent on the iOS simulator. Apple sign-in needs a real Apple ID on the simulator.

1. Email user: change name with an empty last name. Change password with a wrong
   current password — inline error. Then a right one — toast.
2. Apple user: no Update password row. Sign-in row shows Apple.
3. Only Owner with another Member: hand over to that Member. Confirm they are Owner and
   got the alert.
4. Only Owner: choose Delete household. Confirm it and its photos are gone.
5. Apple user deletes. Confirm the Apple sheet shows, the account is gone, the toast shows
   on sign-in, and in Settings > Apple ID > Sign in with Apple, Crumpet is no longer listed.
6. Sign up again with the same Apple ID. Supabase issue #2049 reports a 500 here. If it
   happens, record it in `KNOWLEDGE.md` and stop.
7. Contributor deletes. Their Feed Logs stay with no name. Their posts are gone.
