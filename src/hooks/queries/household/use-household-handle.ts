import { useQuery } from '@tanstack/react-query';

import HouseholdService from '@/services/household.service';

const THIRTY_SECONDS_MS = 30_000;

/**
 * Answers "free to take" for one candidate. The caller debounces, so this is
 * only asked once the Owner stops typing.
 *
 * `staleTime` is zero on purpose: a handle someone else claims a second later
 * has to come back as taken, and the write is guarded by a unique index anyway.
 */
export function useHandleAvailable(candidate: string | undefined) {
  return useQuery({
    queryKey: ['handle-available', candidate],
    queryFn: () => HouseholdService.isHandleAvailable(candidate as string),
    enabled: Boolean(candidate),
    staleTime: 0,
    // One entry per candidate the Owner pauses on. Without a bound, a long
    // session of trying handles keeps every answer for the default five
    // minutes, and none of them is worth re-reading anyway.
    gcTime: THIRTY_SECONDS_MS
  });
}

/** Free handles built from the stem, each one already checked. */
export function useHandleSuggestions(stem: string | undefined) {
  return useQuery({
    queryKey: ['handle-suggestions', stem],
    queryFn: () => HouseholdService.getHandleSuggestions(stem as string),
    enabled: Boolean(stem),
    staleTime: 0,
    gcTime: THIRTY_SECONDS_MS
  });
}
