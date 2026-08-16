import type { InboxRow } from '@/lib/alert-groups';

const someone = (name: string | null) => name ?? 'Member';

const quoted = (caption: string) => `“${caption.trim()}”`;

const slotWord = (label: string | null) =>
  !label || label === 'custom' ? 'feed' : label.toLowerCase();

/**
 * One line of plain English. Every branch has a version that says less, because
 * a row outlives the subject it names.
 */
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

    // Only ever shown to the post's author, so "your" is always true here.
    case 'post_liked':
      return alert.postCaption
        ? `${likers} liked your post ${quoted(alert.postCaption)}`
        : `${likers} liked your photo`;

    case 'member_removed':
      return alert.subjectIsMe
        ? `${actor} removed you from the household`
        : `${actor} removed ${someone(alert.subjectName)}`;

    // Addressed to the person whose role changed, so the reader is always the
    // subject. The new role is not recorded on the alert, so this cannot name it.
    case 'member_role_changed':
      return `${actor} changed your role`;

    case 'member_left':
      return `${someone(alert.subjectName ?? alert.actorName)} left the household`;
  }
}

export type AlertGlyph = 'circleAlert' | 'image' | 'heart' | 'users';

export const alertGlyph = (kind: InboxRow['kind']): AlertGlyph => {
  switch (kind) {
    case 'missed_feed':
      return 'circleAlert';
    case 'post':
      return 'image';
    case 'post_liked':
      return 'heart';
    default:
      return 'users';
  }
};
