# 43. The feature request board is the first public content

Date: 2026-09-22

## Status

Accepted. Issue #238 (CRU-174). Sits beside
[ADR 0017](./0017-household-scoped-posts-are-their-own-object.md) and
[ADR 0031](./0031-comments-are-two-levels-deep.md), which leave out reporting because a Post and its
comments never leave the people the Household chose. Neither covers the board.

## Context

Users want somewhere to ask for features and vote on each other's. UserJot and Canny can sign a
Crumpet user in automatically, but only on a paid plan: UserJot's starts at $29 a month and Canny's
"Auth & SSO" is not on its free plan. The research is in
[userjot-sso-in-expo.md](../research/userjot-sso-in-expo.md). A free hosted board makes the user
create a second account, which nobody does.

So the board is built in Supabase, as a stopgap until there is income to move to UserJot or Canny.

This is the first thing a User writes that every other User can read, across Households. App Store
guideline 1.2 therefore applies in full for the first time: a filter for objectionable content, a
way to report it, a way to block abusive users, a way to contact the developer, and removal within
24 hours. Guideline 5.1.1(v) applies too: deleting an account deletes what the account wrote.

## Decision

- **Every write is an RPC except a vote.** `create_feature_request`, `report_feature_request`,
  `block_feature_request_author`, `set_feature_request_status`, `restore_feature_request` and
  `delete_feature_request` are `security definer` and check the caller themselves. The client has no
  grant on `feature_requests` at all, so nothing but the vote trigger writes `vote_count`.
- **The Crumpet team is a table, not a claim.** `crumpet_team` holds user IDs, has RLS on and no
  client policy. The app asks `is_crumpet_team()` only to decide whether to draw the team's menu
  items. The RPCs are the check.
- **1.2, point by point.** A word list in `private.has_blocked_word` rejects a request on insert.
  Report is on every card. "Hide requests from this person" is the block. Contact support is the
  Settings row above the board. Each report pushes every Crumpet team member through the alerts
  outbox (`feature_request_reported`), which is how removal inside 24 hours happens.
- **Auto-hide is a holding pen, not a verdict.** Three reports from accounts older than seven days
  hide a request from everyone but its author (who sees "Under review") and the team. Restore clears
  the reports. A Crumpet team request never auto-hides.
- **Names are never shown.** The client never learns an author's ID. That is why a block names a
  request, not a person.
- **5.1.1(v):** every table references `auth.users` with `on delete cascade`, and the vote trigger
  runs on those cascades, so counts stay true when an account goes.
- **A report push has no Household.** `alerts.household_id` is now nullable for this kind only, by a
  check constraint, and `send-alerts` sends it to the recipient's tokens directly.
- **No `@expo/ui`.** Its `List` is not virtualised, so it cannot hold a paged board. The Top/New
  switch reuses `SegmentedControl` and the create form is a `BaseSheet`, like every other form.

## Consequences

- Moving to UserJot or Canny later means pointing the one Settings row at their board and exporting
  `feature_requests` and `feature_request_votes`, whose votes are keyed on the same user IDs.
- The word list is short and English. It stops the obvious, not the determined. The report path is
  what catches the rest.
- A ban is a row in `feature_board_bans`, written by hand in SQL. There is no button for it.
