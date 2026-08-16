# 24. Likes on one Post collapse into one inbox row

Date: 2026-08-16

## Status

Accepted. Overturns the deferral recorded in
[ADR 0021](./0021-a-like-is-a-record-not-an-interruption.md).

## Context

ADR 0021 deferred collapsing likes because the row count it saved was at most three, out of an
inbox dominated by feed logs.

[ADR 0023](./0023-feed-logs-are-delivered-but-not-listed.md) took the feed logs out. Likes went
from a rounding error to a large share of what is left, so saving three rows out of thirteen is
worth what saving three out of thirty-nine was not.

## Decision

One row per Post: the most recent liker by name, plus a count of the others. "Lisa and 1 other
liked your post", "Lisa and 3 others liked your post".

The schema does not change. There is still one `alerts` row per like, and the collapse happens at
render in `collapseLikes` (`src/lib/alert-groups.ts`). The rows are already in hand, so it costs a
pass over a list.

**Grouping runs across every page loaded so far, not within a page.** The inbox pages 30 at a time
and likes on one Post routinely straddle the boundary. Collapsing per page would show the same Post
twice, one row above the other, which looks like a bug rather than a compromise.

## Consequences

An inbox row is no longer an Alert. `collapseLikes` returns an `InboxRow`, which carries
`alertIds` — every Alert underneath it — and `otherLikeCount`. Anything that acts on a row acts on
all of its ids.

Marking read follows from that: scrolling a collapsed row into view marks every like under it, and
the row stays unread while any one of them is. A row that cleared its badge while hiding an unread
like would be a count the reader cannot reach.

Clearing must do the same when it lands (CRU-054). One swipe has to dismiss every id in
`alertIds`, not the newest.

The avatar is the most recent liker's, because that is the person the sentence names.
