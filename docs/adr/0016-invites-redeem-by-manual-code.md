---
status: accepted
---

# Invites redeem by a manually entered code, not a deferred deep link

An Owner generates an **Invite**, which produces a short code. They share it as plain text through
their own channel — household name, the code, and a link to the App Store. The invitee installs the
app, signs up, and is offered **Create a household** or **Join with a code** in onboarding. They type
the code and join as a Contributor.

There is no deferred deep link: nothing carries the code across the install. The code is the whole
mechanism, not a fallback behind a link.

This supersedes the link half of
[ADR 0003](./0003-invite-via-shareable-link.md). The invite is still shareable, revocable and
expiring, and it still rides the Owner's own messaging channel — only the carrying mechanism changed.

## Considered options

- **Deferred deep linking via Branch, AppsFlyer or Adjust** — the invitee taps a link, the App Store
  opens, and after install the app recovers the code. Rejected on two counts. It is not free: these
  bundle deep linking inside marketing-attribution suites starting around USD 500/month with annual
  contracts, for an app with no marketing attribution needs. And it is no longer reliable — match
  rates have fallen from roughly 95% before 2021 to **75–85% in 2026**, because iOS App Tracking
  Transparency and Private Relay broke the fingerprinting the technique depends on. At a 1-in-5
  failure rate the manual code has to be built regardless, so paying for the link buys a second path
  to the same screen.
- **Firebase Dynamic Links** — the free option this design would have used. Shut down on
  25 August 2025; existing links return 404. Not available.
- **An iOS App Clip writing the invocation URL to a shared App Group** — genuinely native and
  reliable. Rejected as disproportionate: an entire extra build target, entitlement and review
  surface to carry six characters.
- **Clipboard hand-off** (what Branch market as NativeLink) — the code is written to the pasteboard
  and read on first launch. Rejected: iOS shows a paste banner, users clear clipboards, and the
  failure is silent.
- **Manually entered code** (chosen) — no vendor, no cost, no attribution SDK, no
  `associatedDomains`, and a 100% success rate given the person types it correctly. This is what
  Life360 ships for joining a Circle, in the same shared-group, people-you-already-know context.
  Splitwise is weaker still — you cannot self-join at all, an existing member has to add you.

The decisive framing: an Invite goes to **one person the Owner already knows**, over iMessage. It is
not a growth campaign. Attribution is worthless here, and the failure mode of a broken link — nothing
happens, no explanation — is much worse than the failure mode of a code, which is "type it again".

## Consequences

- **No universal-link infrastructure is needed to ship this.** No `associatedDomains` in `app.json`,
  no apple-app-site-association file, no hosting. The existing `crumpetapp` scheme is untouched.
- **A universal link can be added later as pure enhancement** — so tapping the link opens the app
  directly when it is already installed. That is additive and blocks nothing. Deep-link-across-install
  stays unbuilt.
- **The code format has to survive being read aloud and retyped.** Six uppercase characters with the
  ambiguous glyphs removed (no `O`/`0`, no `I`/`1`), and redemption is case-insensitive.
- **Onboarding gains a fork.** `Create a household` versus `Join with a code` is now the first
  decision after sign-up, which also settles where redemption sits for a user with no account: in
  onboarding, not riding through sign-up.
- **`redeem_household_invite` returns a jsonb status rather than throwing**, the way `log_feed` does.
  `expired`, `revoked`, `already_used` and `already_in_household` each need different copy.
- Anyone with a live code can join until it expires or is revoked. Unchanged from ADR 0003, and still
  the accepted trade-off for low friction.
