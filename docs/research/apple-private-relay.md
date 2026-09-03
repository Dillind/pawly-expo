# Sign in with Apple and Hide My Email

Research for [CRU-029](https://github.com/Dillind/pawly-expo/issues/36). Dated 2026-08-18. Every claim
below is cited to the source that owns it.

## The short version

There is no industry standard here. There is Apple's own guidance, which is two sentences long, and
there is a widespread real-world practice, which is to accept the duplicate account and write a help
article about it.

Apple's guidance is to **tell the user a new account was created and ask if they have an existing one
to link**. Asking a hidden-email user for their real email is permitted, but only if the request is
optional and nothing is gated on it.

---

## 1. What Apple requires versus recommends

### Apple tells you to ask about existing accounts

This is the closest thing to a rule, and it is Apple's own words. From
[Authenticating users with Sign in with Apple](https://developer.apple.com/documentation/signinwithapple/authenticating-users-with-sign-in-with-apple),
under the heading **"Prevent duplicate accounts"**:

> A user may already have an account in your system, but may attempt to use Sign in with Apple to log
> in to that account. Sharing the real email address that's associated with the user's Apple Account
> may not help because it may not be the same email the user uses to create the account with your
> system. There are a couple of ways you can mitigate this issue:
>
> - Implement the `ASAuthorizationPasswordProvider` class to detect and offer keychain credentials
>   that the system already knows about. This works seamlessly to detect and use existing accounts,
>   and prevents creating new accounts using Sign in with Apple.
> - For new accounts that use Sign in with Apple, let the user know that they're creating a new
>   account, and ask if they have any existing accounts to link to.

Two things to notice. First, Apple names the problem in the ticket exactly, including the case where
the _real_ email does not match either. Second, the advice is documentation, not an App Review rule,
so it is a recommendation and not a requirement.

### Asking for the real email is allowed, with conditions

App Store Review Guideline **5.1.1(x)**
([source](https://developer.apple.com/app-store/review/guidelines/)):

> Apps may request basic contact information (such as name and email address) so long as the request
> is optional for the user, features and services are not conditional on providing the information,
> and it complies with all other provisions of these guidelines, including limitations on collecting
> information from kids.

So asking is fine. Making it required, or blocking a feature until they answer, is not. Guideline
**5.1.1(v)** reinforces this: "Apps may not require users to enter personal information to function,
except when directly relevant to the core functionality of the app or required by law."

This is the part that is genuinely ambiguous. The guidelines never mention the relay address, so
they never say whether asking a user who _just chose_ to hide their email for that same email counts
as attempting to "manipulate, trick, or force people to consent" (5.1.1(iv)). The safe reading is
that a plainly-worded, skippable prompt is fine and a nagging or blocking one is not. Nobody at Apple
has written that down.

Guideline **4.8** is not relevant here. It obliges apps that offer a third-party login to also offer
one that lets users keep their email private. Crumpet already offers Sign in with Apple, so 4.8 is
satisfied. It says nothing about what to do with the resulting relay address.

### The relay address is more reliable than you would expect

From
[Communicating using the private email relay service](https://developer.apple.com/documentation/signinwithapple/communicating-using-the-private-email-relay-service),
verbatim:

> Private relay email addresses have the following characteristics:
>
> - They end in `@privaterelay.appleid.com` or `@icloud.com`.
> - They route emails to one of the Apple Account's verified email addresses.
> - They're the same for a user across all apps written by a single development team, and different
>   for the same user across apps written by different development teams.
> - They're active whether or not the user is signed into a device, and whether or not your app is
>   installed on the device. You may send and receive email to the private email address at any time.

Three consequences for us:

- The address is **stable per development team**, not per install. Uninstalling and reinstalling
  Crumpet does not change it.
- It is a **real, deliverable mailbox**. Password reset and invite emails to a relay address work.
- The `@icloud.com` variant means you cannot detect a relay address by checking for
  `@privaterelay.appleid.com` alone.

Two caveats. Sending to a relay address requires registering your outbound domain and passing SPF —
see the same page and
[Configure private email relay service](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/).
And there is a daily cap: "Each private relay email address has a daily limit of 100 emails."

### If the user turns off forwarding

Same page:

> If a user chooses to stop receiving email from your app, the relay server rejects all future emails
> sent to that address. Because the address is the same for all apps written by a development team,
> disabling the relay service informs the user of all other affected apps.

The address does not disappear and the account does not break. Email to it simply bounces. So a
password reset would silently fail for that user. That is a real failure mode worth knowing about.

Apple Support's user-facing description matches:
[How to use Hide My Email with Sign in with Apple](https://support.apple.com/en-us/105078).

### The `user` identifier

`user` is the stable subject identifier Apple returns alongside the tokens
([ASAuthorizationAppleIDCredential.user](https://developer.apple.com/documentation/authenticationservices/asauthorizationappleidcredential/user):
"An identifier for the authenticated user"). It is the `sub` claim in the identity token. Like the
relay address it is scoped to the development team, not the bundle — Apple notes you "may group apps
in your developer account for Sign in with Apple so an app only requests information the first time
the user logs in."

The important behaviour is that email and name are **first-authorisation only**:

> The API collects this information and shares it with your app the first time the user logs in using
> Sign in with Apple. If the user then uses Sign in with Apple on another device, the API doesn't ask
> for the user's name or email again. It collects the information again only if the user stops using
> Sign in with Apple and later reconnects to your app.
>
> Although Apple provides the user's email address in the identity token on all subsequent API
> responses, it doesn't include other information about the user, such as their name.

So the email keeps coming back, but the **name does not**. Capture the name on first sign-in or lose
it. Apple also says reinstalling is safe: "Deleting your app from a device doesn't affect this
capability. If the user reinstalls your app, they can continue to use Sign in with Apple on any of
their devices to sign in with their existing account."

I could not retrieve the Human Interface Guidelines page for Sign in with Apple — it renders only
with JavaScript and its data endpoint 404s. Treat the HIG as unchecked, not as silent.

---

## 2. How the identity industry frames the problem

Everyone agrees on one rule: **do not link on an unverified email**.

**Auth0** is the bluntest. From
[Use Verified Email in User Profiles](https://auth0.com/docs/manage-users/user-accounts/user-profiles/verified-email-usage):

> You should not automatically link accounts based on the user's emails. Always prompt users to
> authenticate again before doing that.

The attack it describes is pre-account takeover. An attacker registers a database account using the
victim's email, links their own social account to it, and waits. The victim later signs up, is told
the account exists, resets the password, and lands inside the attacker's account. Auth0's
[account linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking) page adds
that "your tenant should request authentication for **both** accounts before linking occurs."

**Firebase** takes the position that some providers are trustworthy enough to skip that.
[Manage users](https://firebase.google.com/docs/auth/users):

> User signs in with a trusted provider, then signs in with a different trusted provider with the
> same email (for example, Apple followed by Google). Both providers will be linked without errors.

Apple is on Firebase's trusted list because "accounts are always verified and multi-factor-
authenticated". Untrusted providers throw an error and force a manual link.

**AWS Cognito** does no automatic matching at all. Linking is an explicit admin call,
`AdminLinkProviderForUser`, with a warning attached
([docs](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html)):

> Because `AdminLinkProviderForUser` allows a user with an external federated identity to sign in as
> an existing user in the user pool, it is critical that it only be used with external IdPs and
> provider attributes that have been trusted by the application owner.

None of them offer an answer for the case where there is **no email to match on**. The relay address
is a legitimate, verified, unique address. It is simply a different one. Every automatic strategy
correctly declines to link it, and every provider's fallback is the same: get the signed-in user to
initiate the link themselves.

---

## 3. What real apps actually do

The honest answer, from first-party help pages: they accept the duplicate and document it.

Search for `privaterelay.appleid.com` on any support site and you find a near-identical article
teaching users how to look up their own relay address so they can log in with it. AllTrails, Hallow,
Niantic, Centr, Zaiko and Airalo all have one. That is the shape of the industry practice — not
prevention, but a support page.

Two are worth reading in full because they show the two branches.

**Airalo** treats it as normal and offers a fix in settings.
[What is the @privaterelay.appleid.com email](https://www.airalo.com/help/my-account-airmoney/QT1HK3HU71BG/what-is-the-privaterelayappleidcom-email-and-how-does-it-affect-my-account/8I2R45EEDHDU):

> This is not a mistake — this email address is an Apple Private Relay Email, a privacy feature of
> Apple's "Hide My Email" service.

It explains that mail still reaches them, and tells them they can switch to their real address in
account settings if they prefer. That is the "ask for the email later, optionally" pattern, and it
sits comfortably inside 5.1.1(x).

**Pickup Music** treats it as a bug to be triaged by a human.
[Fix duplicate accounts created by Sign in with Apple](https://help.pickupmusic.com/en/articles/12240806-fix-duplicate-accounts-created-by-sign-in-with-apple)
lists the symptoms (subscription differs between app and web, welcome emails at two addresses,
charges from both Apple and a card) and then asks the user to:

> Collect all emails you may have used (personal and any Apple private relay) … Email
> [support] and tell us which account you want to keep

Its prevention advice is to "Use the **same sign-in method** across devices" and "If you use Apple,
keep the same choice (**Share** or **Hide**) everywhere." Which is to say: the app has no fix, so it
asks the user to be careful.

I found no first-party source describing a proactive in-app "you may already have an account, link
it?" prompt — the thing Apple actually recommends. That does not mean nobody does it. It means I
could not verify it from a primary source, and the visible evidence points the other way.

---

## 4. Supabase specifics

**Automatic linking exists and matches on email.** From
[Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking):

> Supabase Auth automatically links identities with the same email address to a single user … When a
> new user signs in with OAuth, Supabase Auth will attempt to look for an existing user that uses the
> same email address. If a match is found, the new identity is linked to the user.

And the security position, which is Auth0's:

> It would also be an insecure practice to automatically link an identity to a user with an unverified
> email address since that could lead to pre-account takeover attacks. To prevent this from happening,
> when a new identity can be linked to an existing user, Supabase Auth will remove any other
> unconfirmed identities linked to an existing user.

**Manual linking exists, is in beta, and is off by default.** Same page, heading "Manual linking
(beta)":

> Supabase Auth allows a user to initiate identity linking with a different email address when they
> are logged in. To link an OAuth identity to the user, call
> [`linkIdentity()`](https://supabase.com/docs/reference/javascript/auth-linkidentity)

```js
const { data, error } = await supabase.auth.linkIdentity({ provider: 'google' });
```

> You can enable manual linking from your project's authentication
> [configuration options](https://supabase.com/dashboard/project/_/auth/providers) or by setting the
> environment variable `GOTRUE_SECURITY_MANUAL_LINKING_ENABLED: true` when self-hosting.

The docs point at the dashboard's auth provider configuration but do not name the toggle in prose.
The setting is commonly called "Allow manual linking"; I could not confirm that exact label from the
docs, so check the dashboard rather than trusting the string.

Two more facts from the same page. Unlinking is `unlinkIdentity()`, and "the user needs to be signed
in and have at least 2 linked identities" for it to work. And SAML SSO users "will not be considered
as targets for identity linking (automatic or manual) for security reasons" — irrelevant to us today.

**There is also a native-token path.** `signInWithIdToken` and the ID-token form of `linkIdentity`
work without a web redirect for Google, Apple, Facebook, Kakao and Keycloak. That matters because
Crumpet's Apple and Google buttons already use native flows, so the linking call can match them.

**One known sharp edge.**
[supabase/auth#1592](https://github.com/supabase/auth/issues/1592) reports that changing the iOS
bundle ID produces duplicate users for the same Apple sign-in, even without Hide My Email. Worth
remembering before anyone renames the bundle.

---

## 5. What this leaves open

- Apple recommends a link prompt. No app I could find in a primary source ships one. That gap is
  either an opportunity or a sign it is not worth the trouble; the sources cannot tell us which.
- The guidelines do not say whether asking a hidden-email user for their real email reads as
  pressure. Quoted above and genuinely ambiguous.
- The relay address bouncing after a user disables forwarding would break password reset silently.
  Not documented as a known problem by anyone; it follows from Apple's own description.
- The HIG page for Sign in with Apple could not be retrieved and has not been checked.
