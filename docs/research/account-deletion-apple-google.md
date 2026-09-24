# Account deletion with Apple, Google and email sign-in

Research dated 2026-09-24. Every claim is cited to the source that owns it. Anything not confirmed
from a primary source is marked **unverified**.

## How sign-in works today

Checked in `src/services/auth.service.ts`:

- **Apple:** `expo-apple-authentication` `signInAsync` with `FULL_NAME` and `EMAIL` scopes. The
  `identityToken` goes to `supabase.auth.signInWithIdToken({ provider: 'apple' })`. The
  `authorizationCode` the credential also carries (`string | null`, see
  `AppleAuthentication.types.d.ts`) is not used or kept today.
- **Google:** `@react-native-google-signin/google-signin`, `GoogleSignin.signIn()`, then the
  `idToken` goes to `signInWithIdToken({ provider: 'google' })`.
- **Email:** `supabase.auth.signInWithPassword`.
- There is no account deletion code in `src/` or `supabase/` yet.

## Recommendation

One "Delete account" button can do the whole job. After a confirm alert, it re-authenticates with
the provider the user signed in with, then calls one Edge Function that revokes and deletes.

- **Apple user:** call `AppleAuthentication.signInAsync()` again. This is the re-authentication and it
  yields a fresh `authorizationCode`. Send the code to an Edge Function. The function checks the
  code's `sub` matches the caller, exchanges the code at `/auth/token` for a refresh token, revokes it
  at `/auth/revoke`, deletes app data, then calls `auth.admin.deleteUser`. The code lives five minutes,
  so do this straight away.
- **Google user:** call `GoogleSignin.signIn()` again as re-authentication, then
  `GoogleSignin.revokeAccess()` on device, then call the same delete Edge Function. Revoking is good
  practice, not a stated requirement.
- **Email user:** ask for the password again and verify it with `signInWithPassword`, then call the
  delete Edge Function.

Apple's revocation is the one hard requirement. Supabase does not do it for you.

## 1. App Store guideline 5.1.1(v)

- Exact text: "If your app supports account creation, you must also offer account deletion within
  the app." — https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage
- Apple's support page adds the detail
  (https://developer.apple.com/support/offering-account-deletion-in-your-app/):
  - Easy to find, usually in account settings.
  - Delete the whole account and its personal data. Deactivation is not enough.
  - If deletion finishes on a website, link directly to that page.
  - Deletion need not be instant, but tell the user how long it takes.
  - Delete user-generated content tied to the account.
  - Auto-renewable subscriptions: tell the user billing continues through Apple, and point them to
    manage the subscription.
  - Only highly regulated industries may require a support flow. Other apps must not require phone
    calls, emails or tickets.
  - Sign in with Apple: "use the Sign in with Apple REST API to revoke user tokens".

## 2. Sign in with Apple token revocation

**Required?** Yes. Apple's deletion page says apps using Sign in with Apple should revoke tokens on
deletion via the REST API (https://developer.apple.com/support/offering-account-deletion-in-your-app/).

**`POST https://appleid.apple.com/auth/revoke`** —
https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens

- `client_id`: the App ID or Services ID used at sign-in. For native iOS sign-in this is the bundle
  identifier.
- `client_secret`: a JWT signed with the Sign in with Apple private key.
- `token`: the user's refresh token **or** access token.
- `token_type_hint`: `refresh_token` or `access_token`.
- Returns `200` with no body, including when the token was already invalid.
- "In order to revoke authorization for a user, you must obtain a valid refresh token or access
  token. If you don't have either token for the user, you can generate tokens when validating an
  authorization code."

**Getting a token: `POST https://appleid.apple.com/auth/token`** —
https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens

- Send `client_id`, `client_secret`, `code`, `grant_type=authorization_code`.
- The authorization code "is single-use only and valid for five minutes."
- Response carries an id token, an access token and a refresh token.

**Client secret JWT** —
https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret

- Header has `kid`, the 10-character key id of the `.p8` key. Signed ES256.
- Payload: `iss` (Team ID), `iat`, `exp`, `aud` (`https://appleid.apple.com`), `sub` (the client id).
- `exp` may be at most 15777000 seconds (six months) ahead. Generating it per request in the Edge
  Function avoids rotation. (The page is filed under a sibling API; the claims list for Sign in with
  Apple should be read on its own page too — **partly unverified** for the exact field names above.)

**Does Supabase store or revoke Apple tokens?** No.

- supabase/auth issue #1308 asked for revocation on delete. It is closed. The maintainer reply says
  deleting a Supabase Auth user is not the same as deleting an app user and to implement it in the
  app: https://github.com/supabase/auth/issues/1308
- issue #2155 (open) reports the provider access and refresh tokens are `nil` in the session after
  native Apple sign-in: https://github.com/supabase/auth/issues/2155
- With `signInWithIdToken` only the id token reaches Supabase, so there is no refresh token to revoke.
  This is inferred from the code path, not a Supabase statement.
- Side trap: issue #2049 reports a 500 when the same Apple ID signs in again after
  `auth.admin.deleteUser`: https://github.com/supabase/auth/issues/2049 (reported, status not verified).

**User experience.** The app shows the native Sign in with Apple sheet again at delete time
(Face ID or passcode), which returns a fresh `authorizationCode`. The five-minute lifetime makes
this the only reliable way, unless the code is exchanged at every sign-in and the refresh token
stored server-side. Apple does not document the re-prompt as a required pattern; it is the common
community approach (**unverified** as Apple guidance).

## 3. Google

**Play policy.** Apps that allow account creation must offer an in-app deletion path **and** a web
link where users can request deletion without the app:
https://support.google.com/googleplay/android-developer/answer/13327111. The policy governs apps on
Google Play. An iOS-only app is not in scope. It will apply the day Crumpet ships on Android, and the
web link then goes in the Play Console Data safety form.

**Must Google tokens be revoked?** No first-party source found that requires it. Google documents
the revoke endpoint `https://oauth2.googleapis.com/revoke` (POST, `token=` form parameter) as the way
to remove an app's access:
https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke. The sign-in library's
`revokeAccess()` "removes your application from the user authorized applications":
https://react-native-google-signin.github.io/docs/original. Treat it as good practice. Guideline
5.1.1(v)'s line about "a mechanism to revoke social network credentials" is about social-network
login as core functionality; applying it to Google sign-in is an interpretation (**unverified**).

## 4. Re-authentication before deletion

- **Apple:** allowed and suggested. The deletion page says apps may verify identity (for example a
  code or a re-entered password) and confirm intent, as long as it is not unduly burdensome:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/. Not mandatory.
- **Google Play:** no re-authentication requirement found in the policy above.
- **Firebase (Google first-party pattern):** "Some security-sensitive actions—such as deleting an
  account … require that the user has recently signed in", failing with `auth/requires-recent-login`:
  https://firebase.google.com/docs/auth/web/manage-users#re-authenticate_a_user
- **Supabase:** `auth.reauthenticate()` sends a one-time nonce to the user's email or phone, used
  with `updateUser` for a password change when Secure password change is on. It is designed for
  password changes, not deletion, and does not apply to Apple or Google users
  (https://supabase.com/docs/reference/javascript/auth-reauthentication — the page returned 404 on
  fetch today, so **unverified** at that URL).

So: standard practice, not a policy requirement.

## 5. One button, per provider

1. Tap "Delete account". Show an `Alert.alert` with "Cancel" and a destructive "Delete".
2. Re-authenticate:
   - Apple: `signInAsync()`. Keep `authorizationCode`. Cancelling the sheet cancels deletion.
   - Google: `GoogleSignin.signIn()`, then `revokeAccess()`.
   - Email: prompt for the password, verify with `signInWithPassword`.
3. Call one Edge Function with the user's JWT (plus the Apple code). It:
   - verifies the caller;
   - Apple only: builds the client secret, exchanges the code, checks the returned `sub` matches the
     user's Apple identity, revokes the refresh token;
   - deletes app data (households the user solely owns, posts, photos in Storage);
   - calls `auth.admin.deleteUser`.
4. Sign out locally and show a success toast.

The `.p8` key, Team ID and key id live as Edge Function secrets, never in the app.

## Open questions

- If the Apple revoke call fails, do we still delete the account? Suggest: yes, and log it.
- Should the function run if the user signed up with Apple but later linked email? Pick the revoke
  path from `auth.identities`, not from how they signed in this session.
- What happens to a household the user owns with other members? That is a product decision.
- Issue #2049: confirm on QA that the same Apple ID can sign up again after deletion.
- Subscriptions (RevenueCat, not installed yet) will need the billing notice when they ship.
- The Google web deletion link is needed only when an Android release is planned.
