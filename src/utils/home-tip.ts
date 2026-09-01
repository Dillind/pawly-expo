import type { FeedTime } from '@/services/feed-time.service';
import type { Pet } from '@/types/core';

export type HomeTip = {
  petId: string;
  title: string;
  action: string;
};

/**
 * The one hub slot below the tiles, and it stays empty unless the household's
 * real state gives it something to say.
 *
 * Every tip it can give is a feed-time tip, and RLS grants feed-time writes to
 * Owners only -- see "Owners can create feed times". So a Contributor gets
 * silence rather than a softened version: they cannot act on it, and they
 * cannot ask for it in the app either.
 *
 * Filler in this slot is worse than an empty slot: a generic pet tip trains the
 * household to ignore the only place the app volunteers anything. So there is
 * no fallback string, and `null` is a normal answer.
 *
 * One tip at a time, and the first pet in order wins. A list of tips is a
 * to-do list, which is a different screen.
 */
export function findHomeTip(
  pets: Pet[],
  feedTimes: Record<string, FeedTime[]>,
  isOwner: boolean
): HomeTip | null {
  if (!isOwner) return null;

  for (const pet of pets) {
    const times = feedTimes[pet.id];

    // Undefined means the query has not answered yet. Claiming a pet has no
    // feeds while its query is in flight makes the tip flash and retract.
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
