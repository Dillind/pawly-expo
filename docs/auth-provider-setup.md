# Setting up Apple and Google sign-in

Console work only a human can do. Follow it in order — Apple's Services ID cannot be made before
the capability exists, and Supabase cannot be filled in before either console is done.

At the end you will have **six values**. Paste them where each step says; nothing here is secret
except the Apple key file and the client secret, which never enter the repo.

| # | Value | From | Goes to |
|---|---|---|---|
| 1 | Team ID | Apple Developer | Supabase Apple provider |
| 2 | Services ID | Apple Developer | Supabase Apple provider |
| 3 | Key ID + `.p8` file | Apple Developer | Supabase Apple provider |
| 4 | iOS client ID | Google Cloud | `app.config.ts` |
| 5 | Web client ID | Google Cloud | code + Supabase Google provider |
| 6 | Web client secret | Google Cloud | Supabase Google provider |

---

## Part 1 — Apple

### 1.1 Turn on the capability

<https://developer.apple.com/account/resources/identifiers/list>

1. Find the App ID for **`au.com.crumpet.ios`**. If it isn't there, the EAS build created it — check
   under Identifiers → App IDs.
2. Edit it, tick **Sign in with Apple**, then **Configure**.
3. Choose **Enable as a primary App ID**. Grouping is for related apps that should share one consent
   prompt — an iOS app and its Mac counterpart. There is one app, so it is its own primary, and the
   Services ID from 1.3 gets grouped under it via its Primary App ID dropdown.
4. **Server-to-Server Notification Endpoint: leave blank.** Optional, and there is nothing to point
   it at — Supabase exposes no endpoint for it and receiving one means writing an Edge Function.
5. Save.

> What blank costs: Apple would otherwise tell us when someone turns off email forwarding on a
> private relay address, deletes their app account, or deletes their Apple Account. Without it a
> relay address can go dead and we find out when an email bounces. Addable later by pasting a URL —
> nothing here has to be redone.

### 1.2 Find your Team ID

Top right of the Apple Developer site, or Membership details. Ten characters — for this account,
`N676T9WLTV`.

It also appears as the prefix on the App ID (`N676T9WLTV.au.com.crumpet.ios`). On a recent account
the App ID Prefix and the Team ID are the same value; on older ones they can differ, so Membership
details is the authority.

**→ Value 1.**

### 1.3 Create a Services ID

Identifiers → **+** → **Services IDs**.

- Description: `Crumpet Sign In`
- Identifier: **`au.com.crumpet.signin`** — it must be *different* from the app's bundle ID.

Register it, then **go back into it** and tick **Sign in with Apple** → **Configure**. A freshly
registered Services ID has it unticked; skipping this is the usual reason Supabase later rejects the
credentials.

- Primary App ID: `au.com.crumpet.ios`
- Domains and Subdomains: `dofjrttcyjtzvqyttqdo.supabase.co` — host only, no scheme or path
- Return URLs: `https://dofjrttcyjtzvqyttqdo.supabase.co/auth/v1/callback`

**→ Value 2** is the identifier you chose.

> **Verify will fail. Save anyway.** Apple checks domain ownership by fetching
> `apple-developer-domain-association.txt` from the domain, and `supabase.co` is not ours to host on.
>
> It does not matter, because the app uses the **native** flow: the Apple sheet returns an identity
> token that goes straight to `signInWithIdToken`, and no browser redirect ever happens. These two
> fields exist only because Apple will not save a Services ID configuration without them.

> If you cannot find the Services ID again afterwards, the Identifiers list filters to App IDs by
> default — switch the dropdown at the top right.

### 1.4 Create a key

Keys → **+**.

- Name: `Crumpet Sign In Key`
- Tick **Sign in with Apple**, Configure, choose `au.com.crumpet.ios`.

Register, then **Download** the `.p8`.

**→ Value 3** is the Key ID plus that file. **Apple lets you download it once.** Put it somewhere
you will still have next month — a password manager, not Downloads. Do not put it in the repo.

### 1.5 Fill in Supabase

Authentication → Providers → **Apple**. Enable, then:

- Client IDs: `au.com.crumpet.ios` **and** `au.com.crumpet.signin`, comma separated
- Secret Key: generated from Team ID + Services ID + Key ID + the `.p8` contents

Supabase's Apple page has a generator for the secret; if it doesn't, paste the four values and it
builds the JWT itself.

> Both IDs go in Client IDs. The native flow presents the **bundle ID** as the audience, the web
> flow presents the **Services ID**, and a token whose audience is not listed is rejected. Listing
> only one is the usual reason a native Apple sign-in fails with "invalid audience".

---

## Part 2 — Google

<https://console.cloud.google.com/apis/credentials>

### 2.1 Configure the consent screen

APIs & Services → OAuth consent screen. External. App name `Crumpet`, your support email, your
contact email. No scopes beyond the defaults — the app needs email and profile only.

You can leave it in Testing while developing; add your own address under Test users.

### 2.2 Create the iOS client

Credentials → **Create credentials** → **OAuth client ID** → **iOS**.

- Bundle ID: `au.com.crumpet.ios`

**→ Value 4.**

### 2.3 Create the Web client

Credentials → **Create credentials** → **OAuth client ID** → **Web application**.

- Authorised redirect URI: `https://dofjrttcyjtzvqyttqdo.supabase.co/auth/v1/callback`

**→ Value 5** (client ID) and **Value 6** (client secret).

> Two clients, and this trips people up: the library is configured with the **Web** client ID, not
> the iOS one, because that is the audience of the ID token Supabase must verify. The iOS client is
> what makes the native sheet work. You need both.

### 2.4 Fill in Supabase

Authentication → Providers → **Google**. Enable, then:

- Client ID: the **Web** client ID (Value 5)
- Client Secret: Value 6
- Authorized Client IDs: the **iOS** client ID (Value 4)

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

The six values from the table. The `.p8` file itself I never need — only that it is safely stored
and pasted into Supabase.

Then I wire the handlers and we do one dev build to a **physical iPhone**. Apple's sheet cannot be
tested on a simulator, so that build is required either way, which is why both providers are set up
together rather than one at a time.
