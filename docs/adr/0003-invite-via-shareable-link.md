# Household invites use a shareable revocable link/code, not server-sent email

Owners invite people by generating a **shareable invite link** containing a revocable, expiring code (e.g. `https://pawly.app/invite/<code>`), which they send through their own channel (iMessage, WhatsApp). Tapping the link deep-links into the app (falling back to the App Store if not installed); after sign-up the invitee redeems the code and joins the household as a **contributor**. The raw code is also shown as a manual-entry fallback.

## Considered options

- **Server-sent email invites** — invitee is emailed, signs up with that address, gets auto-joined. Rejected for v1: requires email-sending infrastructure and deliverability/spam handling, and couples joining to a specific email address.
- **Shareable link/code** (chosen) — no email infrastructure, rides the owner's existing communication channel, and directly attacks the "invite friction" product risk. `expo-linking` and the `pawlyapp` scheme are already in place.

## Consequences

- Invite codes must be **revocable and expiring** so a leaked link cannot be reused indefinitely.
- Requires universal/deep-link configuration and an `App Store` fallback for uninstalled devices.
- Anyone with a live link can join until it expires or is revoked; this is an accepted trade-off for the reduced friction.
