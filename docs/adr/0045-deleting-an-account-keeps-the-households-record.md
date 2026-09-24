# 0045 — Deleting an account keeps the Household's record

Date: 2026-09-22, revised 2026-09-24
Status: Accepted
Ticket: CRU-156

## Context

Apple guideline 5.1.1(v) requires in-app account deletion. For a Sign in with Apple user, Apple also
requires the app to revoke the user's token through its REST API. Supabase does not keep the Apple
refresh token and does not revoke it (supabase/auth #1308). Deleting a row in `auth.users` needs the
service role, which the app never holds. A User also logged feeds, wrote posts and comments, and may
be the only Owner of a Household other people still use.

The research is in `docs/research/account-deletion-apple-google.md`.

## Decision

**A new Edge Function, `delete-account`, does the delete.** The gateway verifies the caller's JWT.
The function reads the user from that token, never from the body, so a caller can only delete
themselves. It uses the service role for the rest.

**Everyone signs in again first.** An email user types their password, which the app checks with
`signInWithPassword`. An Apple user sees the Apple sheet again. It gives a fresh authorization code,
which the function exchanges for a token and revokes. The function checks that the code belongs to
the same Apple ID as the account, so one Apple ID cannot revoke another. A Google user sees the
Google sheet again, and the app calls `revokeAccess()` after the delete.

**Revocation is best effort.** A failed Apple exchange or revoke is logged and the delete goes on.
The account and data must go whatever Apple answers, and the user can still remove Crumpet under
their Apple ID settings.

**The confirmation is also typed, as in ADR 0040.** The phrase is `delete my account`, trimmed but
not case-folded, checked on the screen and again in the function. Not the email address: an Apple
sign-in hides it behind a relay address nobody can type. No alert on top of it.

**Households are decided by who else is in them.** The Tray's first step shows each one:

- **Only Member:** deleted with the account.
- **Another Owner exists:** the User leaves, through the `household_members` cascade.
- **Only Owner, others remain:** the User must choose. **Handover** makes one Member the Owner
  through `hand_over_household`, which reuses `set_member_role` and its alert, and unlists the
  Household. Or the User names it for deletion, and `prepare_account_deletion` deletes it after
  checking again that they are its one Owner.

`prepare_account_deletion` decides in one transaction, behind a row lock on the user's Households.
It refuses if an only-Owner Household is still unresolved. It returns the photo paths of every
Household it deletes and of every Post the User wrote. The function clears those and the avatar
through the Storage API, then deletes the auth user last.

**What they logged stays; what they said goes.**

| Deleted with the account                                                                             | Kept, author set null                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `users`, `household_members`, `push_tokens`, `alert_reads`, alert recipients, `posts`,               | `feed_logs.logged_by`, `post_comments.reply_to_user_id`, `alerts.actor_id`, invites' `invited_by`,          |
| `post_comments`, `post_likes`, `comment_likes`, `household_follows.follower_id`, `user_entitlements` | `invitee_user_id`, `household_follows.responded_by`, travel checklist `created_by` / `ticked_by`, reminders |

A post is the User's own words and photos, and nobody else relies on it. A Feed Log is the
Household's record: a hole there reads as a missed feed.

`reminders.created_by` and `reminder_completions.done_by` used to cascade, so a Household's Reminder
disappeared with its author. Both are now nullable and `set null`.

## Consequences

- The app signs out with `scope: 'local'`. The server session died with the user.
- A failure after the Households are deleted but before the auth user is gone leaves an account with
  fewer Households. Trying again finishes the job, but the Apple code is single use, so the Apple
  sheet shows again.
- Deleting a User's comment also deletes the replies under it, as deleting a comment always has.
- No `member_left` alert is written for the Households they leave.

## Alternatives considered

- **Block the last Owner and send them away to fix it.** The first version did this. It made the
  User leave the flow, find the Household, change a role and come back.
- **Promote the longest-standing Member automatically.** Quiet transfers of control are worse than
  asking. It also makes a Contributor an Owner without their consent.
- **Keep Posts with no author.** A post is personal content, and the User expects it to go.
- **Stop the delete when Apple revocation fails.** It traps a User in an account they asked to leave.
