import { formatScheduledTime } from '@/lib/dates';
import type { Occurrence } from '@/types/core';

const LABEL_WORD: Record<Occurrence['label'], string> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'feed'
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// "logged", never "fed": the count is of records, not meals. See CONTEXT.md.
export function summarisePetDay(
  occurrences: Occurrence[],
  isPaused: boolean,
  hasFeedTimes: boolean
): string {
  // A paused pet also has no occurrences, so this comes first.
  if (isPaused) return 'Paused — no feeds expected';
  // Feeds exist but none land today. Claiming there are none reads as if the
  // app threw the member's work away.
  if (occurrences.length === 0) return hasFeedTimes ? 'No feeds today' : 'No feeds set up yet';

  const overdue = occurrences.find((occurrence) => occurrence.state === 'missed');
  if (overdue) {
    return `${capitalise(LABEL_WORD[overdue.label])} was due at ${formatScheduledTime(overdue.localTime)}`;
  }

  const next = occurrences.find(
    (occurrence) => occurrence.state === 'due' || occurrence.state === 'upcoming'
  );
  if (next) {
    return `Next: ${LABEL_WORD[next.label]} at ${formatScheduledTime(next.localTime)}`;
  }

  return occurrences.length === 1
    ? 'Logged once today'
    : `Logged ${occurrences.length} times today`;
}
