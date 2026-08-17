# Setting up Apple and Google sign-in

Console work only a human can do.

**Apple is far smaller than it looks**, because Crumpet signs in natively rather than through a web
redirect. Supabase's own Apple guide says it outright:

> If you're building a native app only, you do not need to configure the OAuth settings.

So there is **no Services ID, no signing key, no `.p8`, no domain verification** — and no secret to
rotate every six months, which is a maintenance trap avoided rather than a shortcut taken. Apple
needs one capability ticked and one bundle ID pasted into Supabase.

Google is native-only too, so there is no client secret either. **Two values, both public**, and
nothing in this whole setup is a secret:

| # | Value | From | Goes to |
|---|---|---|---|
| 1 | iOS client ID | Google Cloud | `app.config.ts`, and Supabase Client IDs |
| 2 | Web client ID | Google Cloud | `app.config.ts`, and Supabase Client IDs |

---

## Part 1 — Apple

### 1.1 Turn on the capability

<https://developer.apple.com/account/resources/identifiers/list>

1. Find the App ID for **`au.com.crumpet.ios`**. If it isn't there, the EAS build created it — check
   under Identifiers → App IDs.
2. Edit it, tick **Sign in with Apple**, then **Configure**.
3. Choose **Enable as a primary App ID**. Grouping is for related apps that should share one consent
   prompt — an iOS app and its Mac counterpart. There is one app, so it is its own primary.
4. **Server-to-Server Notification Endpoint: leave blank.** Optional, and there is nothing to point
   it at — Supabase exposes no endpoint for it and receiving one means writing an Edge Function.
5. Save.

> What blank costs: Apple would otherwise tell us when someone turns off email forwarding on a
> private relay address, deletes their app account, or deletes their Apple Account. Without it a
> relay address can go dead and we find out when an email bounces. Addable later by pasting a URL —
> nothing here has to be redone.

### 1.2 Fill in Supabase

Authentication → Providers → **Apple**. Enable it, and put the bundle ID in **Client IDs**:

```
au.com.crumpet.ios
```

Leave Secret Key empty. That field is for the OAuth flow only.

> **Add every bundle ID variant you actually build.** A dev or preview build with its own
> identifier (`au.com.crumpet.ios.dev`, say) presents that as the token audience, and an audience
> not in this list is rejected. Comma separate them.

That is the whole of Apple. **Skip the Services ID, the key and the domain entirely** — if you were
part-way through a Services ID and Apple refused to save it because the Supabase domain cannot be
verified, abandon it. Nothing needs it.

---

## Part 2 — Google

<https://console.cloud.google.com/apis/credentials>

### 2.1 Configure the consent screen

APIs & Services → OAuth consent screen. App name `Crumpet`, your support email, your contact email.
No scopes beyond the defaults — the app needs `email`, `profile` and `openid` only.

**Audience: External.** Internal only exists with a Google Workspace organisation and would limit
sign-in to that org.

Leave it in **Testing** while developing, and add every address that will sign in under **Test
users**. An address not on that list fails with a confusing consent error rather than a useful one.

> The screen warns you "may need to verify your app". You won't. Verification is for *sensitive* and
> *restricted* scopes — Gmail, Drive, Calendar. The three we ask for are non-sensitive, so going from
> Testing to Production is a button, not a review.

### 2.2 Create the iOS client

Credentials → **Create credentials** → **OAuth client ID** → **iOS**.

- Bundle ID: `au.com.crumpet.ios`

**→ Value 1.**

### 2.3 Create the Web client

Credentials → **Create credentials** → **OAuth client ID** → **Web application**.

- Authorised redirect URI: `https://dofjrttcyjtzvqyttqdo.supabase.co/auth/v1/callback`

**→ Value 2.** You can ignore the client secret it also gives you — the native flow never uses it.

> Two clients, and this trips people up twice over.
>
> The library is configured with the **Web** client ID, not the iOS one, because that is the audience
> of the ID token Supabase verifies. The iOS client is what makes the native sheet appear.
>
> They are also indistinguishable as strings. Read which is which off the **Type** column — the iOS
> one has a Bundle ID on its detail page, the Web one has a redirect URI. Swapping them compiles
> fine and fails at runtime with an audience error, on a device, after a rebuild.

### 2.4 Fill in Supabase

Authentication → Providers → **Google**. Enable, then:

Put **both** client IDs in **Client IDs**, comma separated — web first, then iOS. It is a list of
accepted token audiences, not a single client:

```
<web client id>,<ios client id>
```

Leave **Client Secret** empty; it belongs to the web OAuth flow.

Leave **Skip Nonce Check** off. We make the nonce work rather than disabling the check.

---

## Part 3 — Identity linking

**There is no setting to find.** Automatic linking is built into Supabase Auth and always on. When
an OAuth sign-in arrives, it looks for an existing user with the same email and links the new
identity to them — provided **the existing user's email is verified**.

Every account on this project has a verified email, so a Google sign-in with an address that already
exists links to it. Same user, same household, same pets. Nothing forks.

**Apple's private relay is the exception, and it cannot be fixed.** Choosing "Hide My Email" produces
`something@privaterelay.appleid.com`, which matches no existing account, so a new one is created —
correctly, because nothing can tell it is the same person. Choose **Share My Email** when testing
Apple against an account that already exists.

That relay case, and what a user is told when linking cannot happen, is the remaining substance of
issue #36.

> The dashboard toggle near this, **Allow manual linking**, is a different feature — it enables the
> `linkIdentity()` API for a signed-in user to attach another provider deliberately. It is in beta,
> off by default, and not needed for any of the above.

---

## What to send me

The two Google client IDs — **and which is which**, read off the Type column, not from the order
they were created in. The iOS one is the one whose detail page shows a Bundle ID.

Then I wire both handlers and we do one dev build to a **physical iPhone**. Apple's sheet cannot be
tested on a simulator at all, so that build is needed either way — which is why both providers are
set up together rather than one at a time.
