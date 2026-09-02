import { useQueries } from '@tanstack/react-query';

import FeedTimeService, { type FeedTime } from '@/services/feed-time.service';
import type { Pet } from '@/types/core';

/**
 * Every pet's feed times, keyed by pet.
 *
 * `useQueries` rather than one bulk call: the per-pet query already exists and
 * is already cached by `PetSection`, so this reads the same keys instead of
 * adding a second RPC that would go stale on its own schedule.
 */
export function useHouseholdFeedTimes(pets: Pet[]): Record<string, FeedTime[]> {
  return useQueries({
    queries: pets.map((pet) => ({
      queryKey: ['feed-times', pet.id],
      queryFn: () => FeedTimeService.list(pet.id)
    })),
    combine: (results) =>
      Object.fromEntries(
        results.map((result, index) => [pets[index].id, result.data ?? []])
      ) as Record<string, FeedTime[]>
  });
}
