# 0044 — Deleting an account keeps the Household's record

Date: 2026-09-22
Status: Accepted
Ticket: CRU-156

## Context

Apple guideline 5.1.1(v) requires in-app account deletion. Deleting a row in `auth.users` needs the
service role, which the app never holds. And a User is not only their own data: they logged feeds,
wrote posts and comments, and may be the only Owner of a Household other people still use.

## Decision

**A new Edge Function, `delete-account`, does the delete.** The gateway verifies the caller's JWT;
the function reads the user from that token, never from the body, so a caller can only delete
themselves. It uses the service role for the rest.

**The confirmation is typed, as in ADR 0040.** The phrase is `delete my account`, trimmed but not
case-folded, checked on the screen and again in the function. Not the email address: an Apple
sign-in hides it behind a relay address nobody can type. No alert on top of it, for the reason
ADR 0040 gives.

**Households are decided by who else is in them:**

- **The last Owner of a Household with other Members is refused.** The sheet names the Households
  and tells them to promote another Owner or delete the Household first. This is the rule
  `leave_household` already applies. Deleting the Household for them would destroy other people's
  history on a decision about one account.
- **A Household where they are the only Member is deleted with them.** Nobody else can reach it.
- **Every other membership is removed** by the `household_members` cascade.

`prepare_account_deletion` makes that decision in one transaction, behind a row lock on the user's
Households, deletes the sole-member ones and returns their photo paths. The function then clears
the photos and the user's avatar through the Storage API, and deletes the auth user last.

**What they did stays; who they were goes.** Every reference to the user was already either a
cascade (their own rows) or `set null` (the Household's record):

| Cascade (deleted)                                                                   | Set null (kept, no author)                                                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `users`, `household_members`, `push_tokens`, `alert_reads`, alert recipients,       | `feed_logs.logged_by`, `posts.author_id`, `post_comments.author_id`, `reply_to_user_id`, `alerts.actor_id`, invites' `invited_by`, |
| `post_likes`, `comment_likes`, `household_follows.follower_id`, `user_entitlements` | `invitee_user_id`, `household_follows.responded_by`, travel checklist `created_by` / `ticked_by`                                   |

**Reminders were the exception**, and this change fixes them. `reminders.created_by` and
`reminder_completions.done_by` cascaded, so a Household's Reminder, and the tick that says it was
done, disappeared with the member who wrote them. Both are now nullable and `set null`.

## Consequences

- The client signs out with `scope: 'local'`. The server session died with the user, so a global
  sign-out has nothing to revoke. `useCacheReset` then empties the query cache.
- A failure after the Households are deleted but before the auth user is gone leaves an account with
  fewer Households. Retrying finishes the job, because the step that already ran has nothing left
  to do.
- Photos a deleted User uploaded to a Household that survives stay, because the Post they belong to
  stays.
- No `member_left` alert is written for the Households they leave. Other Members see the person
  disappear from the list without a notice.

## Alternatives considered

- **Delete the Household when its last Owner goes.** Rejected above: it hands one person a way to
  destroy everyone else's record by deleting their account.
- **Promote the longest-standing Member automatically.** Quiet transfers of control are worse than
  asking. It also makes a Contributor an Owner without their consent.
- **Delete the user's Feed Logs, Posts and Comments too.** A Household's history would develop holes
  that the missed-feed logic reads as missed feeds.
