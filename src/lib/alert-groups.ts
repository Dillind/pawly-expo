import type { Alert } from '@/services/alert.service';

// Likes on one Post collapse into a single row, so reading or clearing it must
// reach every id in `alertIds`. See ADR 0024.
export type InboxRow = Alert & {
  alertIds: string[];
  otherLikeCount: number;
};

// Grouped across every page loaded, not within a page: likes on one Post
// straddle the 30-row boundary and would otherwise show the Post twice.
export function collapseLikes(alerts: Alert[]): InboxRow[] {
  const rows: InboxRow[] = [];
  const rowByGroup = new Map<string, InboxRow>();

  for (const alert of alerts) {
    // Per comment, not per post: keying by post would fold likes on two
    // comments into one row quoting only one.
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
    // Unread while any like under it is, or scrolling past clears a badge whose
    // reason the reader never saw.
    existing.isRead = existing.isRead && alert.isRead;
  }

  return rows;
}
