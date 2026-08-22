import type { Alert } from '@/services/alert.service';

/**
 * One inbox row. Usually one Alert, but every like on the same Post collapses
 * into a single row whose `alertIds` are all of them — reading or clearing the
 * row must reach each one. See ADR 0024.
 */
export type InboxRow = Alert & {
  alertIds: string[];
  /** Likes on the same Post behind the newest one. */
  otherLikeCount: number;
};

/**
 * Grouped across every page loaded so far, not within a page: likes on one Post
 * routinely straddle the 30-row boundary, and collapsing per page would show
 * the same Post twice.
 */
export function collapseLikes(alerts: Alert[]): InboxRow[] {
  const rows: InboxRow[] = [];
  const rowByGroup = new Map<string, InboxRow>();

  for (const alert of alerts) {
    // Comment likes collapse per COMMENT, not per post. Keying them by post
    // would fold likes on two different comments into one row that then quotes
    // only one of them -- and comments are deliberately not grouped at all,
    // because each one says something different and a count would hide it.
    const groupKey =
      alert.kind === 'post_liked'
        ? alert.postId
        : alert.kind === 'comment_liked'
          ? alert.commentId
          : null;

    if (!groupKey) {
      rows.push({ ...alert, alertIds: [alert.id], otherLikeCount: 0 });
      continue;
    }

    const existing = rowByGroup.get(groupKey);

    if (!existing) {
      const row = { ...alert, alertIds: [alert.id], otherLikeCount: 0 };

      rowByGroup.set(groupKey, row);
      rows.push(row);
      continue;
    }

    existing.alertIds.push(alert.id);
    existing.otherLikeCount += 1;
    // The row is unread while any like under it is, or scrolling past would
    // clear a badge the reader never saw the reason for.
    existing.isRead = existing.isRead && alert.isRead;
  }

  return rows;
}
