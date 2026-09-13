import type { FeedTime } from '@/services/feed-time.service';
import type { Pet } from '@/types/core';

export type HomeTip = {
  petId: string;
  title: string;
  action: string;
};

// Every tip is a feed-time tip, and RLS grants those writes to Owners only, so
// a Contributor gets silence rather than advice they cannot act on. There is no
// fallback string: `null` is a normal answer.
export function findHomeTip(
  pets: Pet[],
  feedTimes: Record<string, FeedTime[]>,
  isOwner: boolean
): HomeTip | null {
  if (!isOwner) return null;

  for (const pet of pets) {
    const times = feedTimes[pet.id];

    // Undefined means the query has not answered: claiming no feeds mid-flight
    // makes the tip flash and retract.
    if (!times) continue;

    if (times.length === 0) {
      return {
        petId: pet.id,
        title: `${pet.name} has no feeds set up.`,
        action: 'Add a feed time'
      };
    }

    if (!times.some((time) => time.label === 'dinner')) {
      return {
        petId: pet.id,
        title: `${pet.name} has no dinner set up.`,
        action: 'Add an evening feed time'
      };
    }
  }

  return null;
}
