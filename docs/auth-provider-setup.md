# Setting up Apple and Google sign-in

Console work only a human can do.

**Apple is far smaller than it looks**, because Crumpet signs in natively rather than through a web
redirect. Supabase's own Apple guide says it outright:

> If you're building a native app only, you do not need to configure the OAuth settings.

So there is **no Services ID, no signing key, no `.p8`, no domain verification** — and no secret to
rotate every six months, which is a maintenance trap avoided rather than a shortcut taken. Apple
needs one capability ticked and one bundle ID pasted into Supabase.

Three values, all from Google:

| # | Value | From | Goes to |
|---|---|---|---|
| 1 | iOS client ID | Google Cloud | `app.config.ts` |
| 2 | Web client ID | Google Cloud | code + Supabase Google provider |
| 3 | Web client secret | Google Cloud | Supabase Google provider |

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

**→ Value 2** (client ID) and **Value 3** (client secret).

> Two clients, and this trips people up: the library is configured with the **Web** client ID, not
> the iOS one, because that is the audience of the ID token Supabase must verify. The iOS client is
> what makes the native sheet work. You need both.

### 2.4 Fill in Supabase

Authentication → Providers → **Google**. Enable, then:

- Client ID: the **Web** client ID (Value 2)
- Client Secret: Value 3
- Authorized Client IDs: the **iOS** client ID (Value 1)

Leave **Skip Nonce Check** off. We make the nonce work rather than disabling the check.

---

## Part 3 — Identity linking

Authentication → Providers (or Settings, depending on dashboard version). Find the identity-linking
setting and **tell me what it says before anyone signs in with Google.**

This matters more here than on a new project: every existing account is email-only, and
`dylan.lindsay234@gmail.com` and `lisahinton00@gmail.com` are both Gmail addresses. The first Google
sign-in with either is the collision case in issue #36, against live household data.

**Use a throwaway address for the first Google test.** If linking is off, signing in with your own
address creates a second account, and from inside the app it looks like your pets are gone.

---

## What to send me

The three Google values, and confirmation that Apple's provider is enabled with the bundle ID in
Client IDs.

Then I wire both handlers and we do one dev build to a **physical iPhone**. Apple's sheet cannot be
tested on a simulator at all, so that build is needed either way — which is why both providers are
set up together rather than one at a time.
