import FeedingScheduleService from '@/services/feeding-schedule.service';
import { useQuery } from '@tanstack/react-query';

const LIVE_REFETCH_MS = 60_000;

/**
 * `date` is an ISO YYYY-MM-DD string in the household's timezone — never a
 * Date, which re-serialises every render and thrashes the cache key.
 *
 * `live` is for today only. `state` is computed server-side at fetch time, so
 * a slot sitting at `due` would otherwise flip to `missed` with nothing telling
 * the client.
 */
export function useSlotStates(
  petId: string | undefined,
  date: string | undefined,
  options?: { live?: boolean }
) {
  return useQuery({
    queryKey: ['slot-states', petId, date],
    queryFn: () => FeedingScheduleService.getSlotStates(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date),
    refetchInterval: options?.live ? LIVE_REFETCH_MS : false
  });
}
