import FeedTimeService from '@/services/feed-time.service';
import type { Occurrence, Pet } from '@/types/core';
import { useQueries } from '@tanstack/react-query';

// Matches `useOccurrences`, so the two never disagree about how fresh the same
// cache key is.
const OCCURRENCES_STALE_MS = 15_000;

/**
 * Every pet's occurrences for one day, flattened.
 *
 * The banner counts what is left across the whole household, and `PetSection`
 * already caches this key per pet -- so this reads the same cache rather than
 * issuing a second, separately-stale request.
 */
export function useHouseholdOccurrences(pets: Pet[], day: string | undefined): Occurrence[] {
  return useQueries({
    queries: pets.map((pet) => ({
      queryKey: ['occurrences', pet.id, day],
      queryFn: () => FeedTimeService.getOccurrences(pet.id, day as string),
      enabled: Boolean(day),
      staleTime: OCCURRENCES_STALE_MS
    })),
    combine: (results) => results.flatMap((result) => result.data ?? [])
  });
}
