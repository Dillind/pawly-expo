import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/lib/query-keys';
import FeedTimeService from '@/services/feed-time.service';

const LIVE_REFETCH_MS = 60_000;

// Short, because `state` is computed server-side and ages on its own. Long
// enough that a tab switch back to Home does not re-run one RPC per pet.
const OCCURRENCES_STALE_MS = 15_000;

// `date` is an ISO string, never a Date, which re-serialises every render and
// thrashes the cache key. `live` is for today only, because `state` is computed
// server-side and would flip to `missed` with nothing telling the client.
export function useOccurrences(
  petId: string | undefined,
  date: string | undefined,
  options?: { live?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.occurrences.day(petId, date),
    queryFn: () => FeedTimeService.getOccurrences(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date),
    refetchInterval: options?.live ? LIVE_REFETCH_MS : false,
    staleTime: OCCURRENCES_STALE_MS
  });
}

export function useRefreshOccurrences() {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.refetchQueries({ queryKey: queryKeys.occurrences.all, type: 'active' }),
    [queryClient]
  );
}
