import type { InboxRow } from '@/lib/alert-groups';

const someone = (name: string | null) => name ?? 'Member';

const quoted = (caption: string) => `“${caption.trim()}”`;

const slotWord = (label: string | null) =>
  !label || label === 'custom' ? 'feed' : label.toLowerCase();

// Every branch has a version that says less, because a row outlives its
// subject.
export function alertSentence(alert: InboxRow): string {
  const actor = someone(alert.actorName);
  const likers =
    alert.otherLikeCount > 0
      ? `${actor} and ${alert.otherLikeCount} ${alert.otherLikeCount === 1 ? 'other' : 'others'}`
      : actor;

  switch (alert.kind) {
    case 'missed_feed':
      return alert.petName
        ? `${alert.petName}’s ${slotWord(alert.slotLabel)} was missed`
        : 'A feed was missed';

    case 'post':
      return alert.postCaption
        ? `${actor} posted ${quoted(alert.postCaption)}`
        : `${actor} shared a photo`;

    // Only shown to the post's author, so "your" is always true.
    case 'post_liked':
      return alert.postCaption
        ? `${likers} liked your post ${quoted(alert.postCaption)}`
        : `${likers} liked your photo`;

    // A recipient can be in the thread while owning neither the post nor the
    // parent.
    case 'post_commented': {
      const said = alert.commentBody ? ` ${quoted(alert.commentBody)}` : '';

      if (alert.commentIsReplyToMe) return `${actor} replied to your comment${said}`;
      if (alert.commentPostIsMine) return `${actor} commented on your post${said}`;

      return `${actor} also commented${said}`;
    }

    case 'comment_liked':
      return alert.commentBody
        ? `${likers} liked your comment ${quoted(alert.commentBody)}`
        : `${likers} liked your comment`;

    case 'member_removed':
      return alert.subjectIsMe
        ? `${actor} removed you from the household`
        : `${actor} removed ${someone(alert.subjectName)}`;

    // The new role is not recorded on the alert, so this cannot name it.
    case 'member_role_changed':
      return `${actor} changed your role`;

    case 'member_left':
      return `${someone(alert.subjectName ?? alert.actorName)} left the household`;

    case 'follow_requested':
      return `${actor} requested to follow your household`;

    case 'reminder_due':
      return alert.petName
        ? `${alert.petName} has a reminder coming up`
        : 'A reminder is coming up';

    case 'feature_request_reported':
      return 'A feature request was reported';
  }
}

export type AlertGlyph = 'circleAlert' | 'image' | 'heart' | 'comment' | 'users';

export const alertGlyph = (kind: InboxRow['kind']): AlertGlyph => {
  switch (kind) {
    case 'missed_feed':
    case 'reminder_due':
      return 'circleAlert';
    case 'post':
      return 'image';
    case 'post_liked':
    case 'comment_liked':
      return 'heart';
    case 'post_commented':
      return 'comment';
    default:
      return 'users';
  }
};
