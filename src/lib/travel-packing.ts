const DAY_MS = 86_400_000;

// A week: long enough that the trip is over, short enough that the list is not
// wanted for the next one yet. The card asks; nothing resets on its own.
export const PACKED_STALE_AFTER_DAYS = 7;

type TickState = { isTicked: boolean; tickedAt: string | null };

export function packedAt(items: TickState[]): string | null {
  if (items.length === 0 || items.some((item) => !item.isTicked)) return null;

  const times = items.map((item) => item.tickedAt).filter((time): time is string => Boolean(time));
  if (times.length === 0) return null;

  return times.reduce((latest, time) => (time > latest ? time : latest));
}

export function isPackedStale(packedAtIso: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(packedAtIso).getTime() >= PACKED_STALE_AFTER_DAYS * DAY_MS;
}

// A duration, not a calendar day, so it reads the same wherever the reader is.
export function describePackedAge(packedAtIso: string, now: Date = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - new Date(packedAtIso).getTime());
  const hours = Math.floor(elapsed / 3_600_000);

  if (hours < 1) return 'just now';
  if (hours < 24) return 'today';

  const days = Math.floor(elapsed / DAY_MS);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks} weeks ago`;
}
