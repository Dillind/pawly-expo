import { useQuery } from '@tanstack/react-query';

import HouseholdService from '@/services/household.service';

const THIRTY_SECONDS_MS = 30_000;

// `staleTime` is zero on purpose: a handle someone else claims a second later
// must come back as taken. The write is guarded by a unique index anyway.
export function useHandleAvailable(candidate: string | undefined) {
  return useQuery({
    queryKey: ['handle-available', candidate],
    queryFn: () => HouseholdService.isHandleAvailable(candidate as string),
    enabled: Boolean(candidate),
    staleTime: 0,
    // Without a bound, a long session of trying handles keeps every answer.
    gcTime: THIRTY_SECONDS_MS
  });
}

export function useHandleSuggestions(stem: string | undefined) {
  return useQuery({
    queryKey: ['handle-suggestions', stem],
    queryFn: () => HouseholdService.getHandleSuggestions(stem as string),
    enabled: Boolean(stem),
    staleTime: 0,
    gcTime: THIRTY_SECONDS_MS
  });
}
