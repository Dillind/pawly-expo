import type { Alert } from '@/services/alert.service';

/**
 * A row's sentence, split so the actor's name can be drawn bold inside one
 * line of text. `lead` is null when nobody did it — a missed feed is the
 * schedule noticing, not a person acting.
 */
export type AlertSentence = { lead: string | null; rest: string };

// Matches authorName in supabase/functions/send-alerts/message.ts.
const someone = (name: string | null) => name ?? 'Member';

// A subject deleted after the fact leaves the row with nothing to name, so
// every branch below has a version that says less rather than one that breaks.
const quoted = (caption: string | null) => (caption ? ` “${caption.trim()}”` : '');

const slotWord = (label: string | null) =>
  !label || label === 'custom' ? 'feed' : label.toLowerCase();

export function alertSentence(alert: Alert): AlertSentence {
  const actor = someone(alert.actorName);

  switch (alert.kind) {
    case 'feed_logged':
      return alert.petName
        ? { lead: actor, rest: ` fed ${alert.petName}` }
        : { lead: actor, rest: ' logged a feed' };

    case 'missed_feed':
      return alert.petName
        ? { lead: null, rest: `${alert.petName}’s ${slotWord(alert.slotLabel)} was missed` }
        : { lead: null, rest: 'A feed was missed' };

    case 'post':
      return alert.postCaption
        ? { lead: actor, rest: ` posted${quoted(alert.postCaption)}` }
        : { lead: actor, rest: ' shared a photo' };

    case 'member_removed':
      return alert.subjectIsMe
        ? { lead: actor, rest: ' removed you from the household' }
        : { lead: actor, rest: ` removed ${someone(alert.subjectName)}` };

    // The new role is not recorded on the alert, so this cannot name it.
    case 'member_role_changed':
      return alert.subjectIsMe
        ? { lead: actor, rest: ' changed your role' }
        : { lead: actor, rest: ` changed ${someone(alert.subjectName)}’s role` };

    case 'member_left':
      return { lead: someone(alert.subjectName ?? alert.actorName), rest: ' left the household' };
  }
}

export type AlertGlyph = 'utensils' | 'alertCircle' | 'image' | 'users';

export const alertGlyph = (kind: Alert['kind']): AlertGlyph => {
  switch (kind) {
    case 'feed_logged':
      return 'utensils';
    case 'missed_feed':
      return 'alertCircle';
    case 'post':
      return 'image';
    default:
      return 'users';
  }
};
