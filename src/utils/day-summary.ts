import type { Occurrence } from '@/types/core';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Counts records, not meals: "to log", never "to feed". A day that is not today
// gets a different sentence. See CONTEXT.md.
export function describeDay(occurrences: Occurrence[], isToday: boolean): string {
  if (occurrences.length === 0) return isToday ? 'Nothing scheduled today' : 'Nothing scheduled';

  if (!isToday) return `${plural(occurrences.length, 'feed')} scheduled`;

  const pending = occurrences.filter(
    (occurrence) => occurrence.state === 'due' || occurrence.state === 'missed'
  ).length;

  if (pending > 0) return `${plural(pending, 'feed')} to log`;

  const upcoming = occurrences.filter((occurrence) => occurrence.state === 'upcoming').length;

  if (upcoming > 0) return `${plural(upcoming, 'feed')} still to come`;

  return 'All done for today';
}
