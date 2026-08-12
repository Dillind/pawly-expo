# Household invites use a shareable revocable link/code, not server-sent email

## Status

**Superseded by ADR 0020.** The link is dead — Firebase Dynamic Links shut down in August 2025 and
deferred match rates no longer justify the infrastructure. Invites are now keyed to an email
address and delivered inside the app, with the code and a QR as the fallback. Nothing in this ADR
was ever built.

What survives: the code is still revocable and expiring, and Crumpet still sends no email. What
this ADR called "server-sent email invites" and rejected is *not* what replaced it — ADR 0020 uses
the address only as a lookup key.

## Original decision

Owners invite people by generating a **shareable invite link** containing a revocable, expiring code (e.g. `https://crumpet.app/invite/<code>`), which they send through their own channel (iMessage, WhatsApp). Tapping the link deep-links into the app (falling back to the App Store if not installed); after sign-up the invitee redeems the code and joins the household as a **contributor**. The raw code is also shown as a manual-entry fallback.

## Considered options

- **Server-sent email invites** — invitee is emailed, signs up with that address, gets auto-joined. Rejected for v1: requires email-sending infrastructure and deliverability/spam handling, and couples joining to a specific email address.
- **Shareable link/code** (chosen) — no email infrastructure, rides the owner's existing communication channel, and directly attacks the "invite friction" product risk. `expo-linking` and the `crumpetapp` scheme are already in place.

## Consequences

- Invite codes must be **revocable and expiring** so a leaked link cannot be reused indefinitely.
- Requires universal/deep-link configuration and an `App Store` fallback for uninstalled devices.
- Anyone with a live link can join until it expires or is revoked; this is an accepted trade-off for the reduced friction.
