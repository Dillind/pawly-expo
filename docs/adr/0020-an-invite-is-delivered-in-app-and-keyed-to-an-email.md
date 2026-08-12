# 20. An Invite is delivered in the app, keyed to an email address

Date: 2026-08-12

## Status

Accepted. Supersedes ADR 0003.

## Context

ADR 0003 chose a shareable link carrying a revocable code, sent by the Owner through their own
channel, with the raw code as a manual fallback. Nothing was ever built — there is no invite table,
no RPC and no UI, and members are added by running SQL against production by hand.

Three things have changed since.

**The link half of ADR 0003 is not buildable.** Firebase Dynamic Links shut down on 25 August 2025
and the free option went with it. Branch, AppsFlyer and Adjust bundle deep linking inside
marketing-attribution suites at roughly USD 500/month on annual contracts, for an app with no
attribution needs. Deferred match rates fell from around 95% before 2021 to 75–85% in 2026, because
App Tracking Transparency and Private Relay broke the fingerprinting underneath. At one failure in
five you must build manual entry regardless, so the link buys a second route to a screen that
already has one.

**There is now somewhere to deliver an invite.** ADR 0012 made alerts an outbox, and the
notification inbox designed on top of it gives an invite a place to sit and be acted on. When
ADR 0003 was written the only way to reach someone was to hand them a string.

**A user may now belong to several households**, so an invite is no longer a once-in-a-lifetime
event that can justify friction.

The residual problem is identification. Crumpet has no usernames, no handles and no contacts
access, so the Owner has to type something. The only identifier an account has is its email
address — and asking for one raises the question of what to say when it does not match an account.
"No user with that email" is an account-enumeration oracle: it lets anyone test addresses to
discover who uses Crumpet.

## Decision

**An Invite is created against an email address and delivered inside the app. Crumpet never sends
email.** The address is a lookup key, not a delivery channel.

If the address already has an account, the Invite resolves to that user, pushes, and appears in
their notification inbox as the one actionable row — Accept or Decline. If it does not, the Invite
stays pending against the address, and is waiting on the first screen after someone signs up with
it. Supabase verifies the address by OTP before an account exists (ADR 0006), so an unverified
address cannot claim an Invite.

Because the Invite is created either way, **there is no failure case to report**. The confirmation
is always "Invite sent to &lt;address&gt;", never a lookup result.

Every Invite also carries a short code, shown as text and as a QR. That is the fallback path for
anyone the address cannot reach.

## Consequences

The enumeration oracle is removed by construction rather than mitigated. There is no branch in
which the app knows something about an address that it declines to say — it genuinely does not
look.

**Confirmation moves from the moment of sending to a list of pending Invites** in household
settings: who, which role, when, and Revoke. This is more honest than a send-confirmation, which
could only ever report that a row was written. It is also the only surface that can show the Invite
was accepted.

**Apple's private relay is the hole the code fills.** Google hands over the real address, so Google
sign-in matches normally. Apple, when "Hide My Email" is chosen, gives an
`@privaterelay.appleid.com` address, and an Invite sent to the person's real address will never
resolve. This is the same root cause as the duplicate-account problem, and it is the main reason
codes remain rather than a courtesy.

**Phone numbers cannot key an Invite.** Accounts are email-based; a number is not an identifier on
one. Supporting it means SMS verification and a new sign-in path. What "invite by phone" actually
wants is iMessage, which the share sheet and the code already provide.

A searchable directory of public households was considered and rejected. A household implies a
home, a routine, pets by name and when the house is empty; making that searchable is a safety
surface rather than a discovery feature, and it inverts the direction of consent. **Every join is
Owner-initiated.**

A universal link for the already-installed case remains fine to add later. Deep-linking across
install stays unbuilt, and the numbers above are why.
