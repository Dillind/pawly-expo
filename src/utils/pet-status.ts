import { formatScheduledTime } from '@/lib/dates';
import type { Occurrence } from '@/types/core';

const LABEL_WORD: Record<Occurrence['label'], string> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'feed'
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * The one line under a pet's name, on Home and on Pets. It answers "what, if
 * anything, do I do about this pet right now" — an overdue feed first, then the
 * next one due, then the quiet case.
 *
 * "logged", never "fed" -- the count is of records, not meals, and the app does
 * not know whether the pet ate. CONTEXT.md, Not Logged.
 *
 * Shared so the two screens cannot drift into two vocabularies for one state.
 */
export function summarisePetDay(
  occurrences: Occurrence[],
  isPaused: boolean,
  hasFeedTimes: boolean
): string {
  // A paused pet also has no occurrences, so this has to come first — otherwise
  // a boarding pet reads as one nobody has set up.
  if (isPaused) return 'Paused — no feeds expected';
  // Feeds exist but none land today: a new pet's feeds start tomorrow, and a
  // weekday-only feed says nothing on a Sunday. Claiming there are none reads
  // as if the app threw the member's work away.
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
