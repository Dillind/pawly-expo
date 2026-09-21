import { useQuery } from '@tanstack/react-query';

import FeedLogService from '@/services/feed-log.service';

// Under the `occurrences` prefix so every feed-log mutation and refresh already reaches it.
export function useOffScheduleLogs(
  petId: string | undefined,
  day: string | undefined,
  timezone: string | undefined
) {
  return useQuery({
    queryKey: ['occurrences', petId, 'off-schedule', day],
    queryFn: () =>
      FeedLogService.getOffScheduleForDay(petId as string, day as string, timezone as string),
    enabled: Boolean(petId) && Boolean(day) && Boolean(timezone)
  });
}
