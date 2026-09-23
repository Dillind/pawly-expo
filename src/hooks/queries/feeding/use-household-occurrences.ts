import { useQueries } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import FeedTimeService from '@/services/feed-time.service';
import type { Occurrence, Pet } from '@/types/core';

// Matches `useOccurrences`, so the two never disagree about the same key.
const OCCURRENCES_STALE_MS = 15_000;

// `PetSection` already caches this key per pet, so this reads the same cache
// rather than issuing a second, separately-stale request.
export function useHouseholdOccurrences(pets: Pet[], day: string | undefined): Occurrence[] {
  return useQueries({
    queries: pets.map((pet) => ({
      queryKey: queryKeys.occurrences.day(pet.id, day),
      queryFn: () => FeedTimeService.getOccurrences(pet.id, day as string),
      enabled: Boolean(day),
      staleTime: OCCURRENCES_STALE_MS
    })),
    combine: (results) => results.flatMap((result) => result.data ?? [])
  });
}
