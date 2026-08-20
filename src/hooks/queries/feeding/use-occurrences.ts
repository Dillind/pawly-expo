import FeedTimeService from '@/services/feed-time.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

const LIVE_REFETCH_MS = 60_000;

/**
 * `date` is an ISO YYYY-MM-DD string in the household's timezone — never a
 * Date, which re-serialises every render and thrashes the cache key.
 *
 * `live` is for today only. `state` is computed server-side at fetch time, so
 * an occurrence sitting at `due` would otherwise flip to `missed` with nothing
 * telling the client.
 */
export function useOccurrences(
  petId: string | undefined,
  date: string | undefined,
  options?: { live?: boolean }
) {
  return useQuery({
    queryKey: ['occurrences', petId, date],
    queryFn: () => FeedTimeService.getOccurrences(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date),
    refetchInterval: options?.live ? LIVE_REFETCH_MS : false
  });
}

/**
 * Every pet's occurrences at once, for a screen that renders several and holds
 * no single query of its own to refetch.
 */
export function useRefreshOccurrences() {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.refetchQueries({ queryKey: ['occurrences'], type: 'active' }),
    [queryClient]
  );
}
