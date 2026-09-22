# Signing Crumpet users in to UserJot

Research for [issue #238](https://github.com/Dillind/pawly-expo/issues/238). Dated 2026-09-22. Every
claim is cited to the source that owns it. Anything not confirmed by a primary source is marked
**unverified**.

## The short version

Yes, it is possible. A signed-in Crumpet user can post and upvote on UserJot without making a UserJot
account. UserJot calls this **Automatic Login**.

It is not free. Automatic Login needs a paid plan, from Starter ($29/month). On the Free plan the
setting is shown but disabled.

The app does not need a web script. UserJot has an official iOS (Swift) SDK, and there is a small
community React Native port. Both open the board in a WebView with the user packed into the URL.

The signature must be made on a server. For Crumpet that is a Supabase Edge Function.

---

## 1. How UserJot identifies a user

There are two separate mechanisms. Only the first fits Crumpet.

### Automatic Login (the one we want)

You identify the user in the SDK. UserJot then attaches a `clientToken` to its links, so the user
lands on the board already signed in.
Source: [Automatic login](https://userjot.com/docs/automatic-login).

- **Fields:** `id` is required. `email`, `firstName`, `lastName`, `avatar`, `traits`, `companies` and
  `signature` are optional.
  Source: [Identify users](https://userjot.com/docs/identify-users).
- **Signed mode:** when "Require signed tokens" is on, the payload must include a `signature`. That
  is an **HMAC SHA-256 of the user ID**, keyed with the **Project secret**. The secret is under
  Settings → Login → Secrets.
  Source: [Automatic login](https://userjot.com/docs/automatic-login).
- **Unsigned mode** is also allowed. Without it, anyone can claim any user ID, because the token is
  built on the device (see section 2). Crumpet should always turn signed mode on.
- **Plan:** "Automatic login requires a paid plan. On the Free plan, the toggle is visible but
  disabled." Source: [Automatic login](https://userjot.com/docs/automatic-login).

### Board SSO (not the one we want)

A redirect flow. UserJot sends the browser to your login URL. You redirect back to
`https://api.userjot.com/auth/sso` with a JWT and the original `state`. The JWT is signed `HS256`
with the same Project secret. Required claims are `sub`, `iss` (Project ID), `aud` = `userjot` and
`exp`. Optional claims are `email`, `firstName`, `lastName`, `avatar`, `traits` and `companies`.
Five to fifteen minutes is the suggested lifetime.
Source: [Single sign-on](https://userjot.com/docs/single-sign-on).

"Board login modes require the Professional plan." Same source. It also needs a web login page for
Crumpet, which does not exist. The docs say nothing about mobile apps for this flow.

## 2. Mobile SDKs and how they work

- **Official iOS SDK:** [UserJot/userjot-ios](https://github.com/UserJot/userjot-ios). Swift only. It
  has `identify` with the same fields and the server-made HMAC signature.
- **React Native:** [userjot-react-native](https://github.com/Pythonen/userjot-react-native)
  (npm `userjot-react-native`, v0.3.1, last published 2026-03-01). Its README says it is **unofficial,
  community-maintained, beta**, and a mirror of the Swift SDK. Peer dependency is
  `react-native-webview`.

I read the published source of v0.3.1. It does three things:

1. `setup(projectId)` fetches `https://widget.userjot.com/widget/mobile/v1/<projectId>/hello` to learn
   the board's public URL.
2. `identify(user)` only stores the user in memory. Nothing is sent yet.
3. Building a board URL appends `?clientToken=<base64 of {id: projectId, user: {...}}>`. The token is
   plain base64 JSON, not encrypted. The only thing that stops forgery is the `signature` field.

The components then open that URL in a modal WebView.

### Two ways to show it in Expo

**Option A — WebView (`react-native-webview`).** This is what both SDKs do. The WebView has its own
cookie jar, separate from Safari. UserJot can set its session cookie there. On logout, stop
attaching the token (`UserJot.logout()`). Whether UserJot's cookie survives in the WebView after a
Crumpet logout is **unverified**. Clear WebView data on sign-out to be safe.

**Option B — `expo-web-browser` (SFSafariViewController).** Open the same `clientToken` URL. It works
the same way in principle, since the token is in the URL. But the session cookie then lives in the
Safari view's store, which Crumpet cannot clear on logout. The next person on a shared phone could
land signed in as the last one. Whether UserJot sets a cookie at all from `clientToken` is
**unverified**.

Option A is the documented path and the easier one to clean up.

We do not have to take the community package. It is about 100 lines. Copying its URL-building into
`src/services/` and rendering our own WebView sheet removes a beta dependency. The `/hello` endpoint
and `clientToken` format are not publicly documented by UserJot, so either way they could change
(**risk**).

## 3. Plans

From [userjot.com](https://userjot.com) and
[the Canny comparison page](https://userjot.com/compare/canny-alternative):

| Plan         | Price     | Relevant                                                                                   |
| ------------ | --------- | ------------------------------------------------------------------------------------------ |
| Free         | $0/month  | 2 boards, unlimited users and posts, public roadmap and changelog. **No Automatic Login.** |
| Starter      | $29/month | 5 boards, custom domain, guest posting. **Automatic Login.**                               |
| Professional | $59/month | Unlimited boards, SAML SSO, board login modes (redirect SSO).                              |

Whether plain unsigned `identify` in the widget does anything useful on Free is **unverified**. The
mobile SDK relies entirely on the `clientToken`, which is Automatic Login, so on Free it likely does
not sign the user in.

## 4. Where to sign, and the flow

The Project secret cannot ship in the app. The signature is made server-side.

1. The user opens Feedback in Crumpet.
2. The app calls a new Edge Function, for example `userjot-signature`, with its Supabase session.
3. The function verifies the caller's JWT and reads `auth.uid()`. It never takes a user ID from the
   request body, or anyone could get a signature for anyone.
4. It returns `hex(HMAC_SHA256(PROJECT_SECRET, userId))`. The secret is a Supabase function secret.
5. The app builds the `clientToken` URL with `{ id, signature }` and opens it in a WebView.

The signature depends only on the user ID, so it never expires. It can be cached per user. The
flip side: a leaked signature works for that user forever, until the Project secret is rotated.

Use the Supabase user ID as `id`. It is stable and says nothing about the person.

## 5. Canny, for comparison

- Canny's Identify SDK ties feedback to "their existing user account in your application", with a
  separate secure Identify option. Source: [Canny install docs](https://developers.canny.io/install).
- Canny's pricing page lists "Auth & SSO" on Pro and Business, not Free. Free allows 25 tracked
  users. Source: [canny.io/pricing](https://canny.io/pricing).
- So the user's belief is right: Canny does support this. It is also paid there, and Free caps
  tracked users where UserJot does not.
- Whether Canny's secure Identify on its own (without "SSO") is on Free is **unverified**.
- UserJot's own comparison says Canny puts SSO on custom-priced Business. That is a competitor's
  claim and it conflicts with Canny's page, so trust Canny's page.

## 6. Privacy (for #214)

What reaches UserJot depends on what we send. The minimum is the Supabase user ID and the HMAC.

- With only `id`, UserJot holds an opaque ID plus whatever the user types into posts and comments.
- Adding `email`, name or avatar sends personal information. It would let us reply by email and
  lets UserJot send notifications, but the privacy policy must then name UserJot as a processor.
- The token sits in a URL, so it may appear in UserJot's logs. It is base64, not encrypted.
- Posts on a public board are public. Users should be told that before they post.

The policy should list UserJot, what fields we send, and that public posts are visible to others.

## 7. Verdict

**Possible.** UserJot supports exactly this, as Automatic Login with a server-signed HMAC.

**Recommended approach:**

- Starter plan ($29/month), Automatic Login on, "Require signed tokens" on.
- A Supabase Edge Function that signs the caller's own user ID.
- Our own small WebView sheet in the app, following the official Swift SDK's behaviour. Or the
  community package, accepting its beta status.
- Send only the user ID at first. Add email later only if we need to reply, and update #214 then.

**Open risks:**

- The mobile `clientToken` format and `/hello` endpoint are only visible in SDK source, not in
  UserJot's docs. They could change.
- The React Native package is unofficial and beta.
- Session cleanup on logout inside the WebView is unverified. Test it on a device with two accounts.
- Not free. On the Free plan users would have to make a UserJot account, or post as guests (guest
  posting is also Starter).
