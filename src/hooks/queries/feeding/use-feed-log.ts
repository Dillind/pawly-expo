import { useQuery } from '@tanstack/react-query';

import FeedLogService from '@/services/feed-log.service';

/**
 * One log, fetched directly by id. A notification tapped three weeks later
 * points at a log nowhere near page 1, so the deep-linked sheet must not read
 * from the paged list — paging until found is unbounded.
 */
export function useFeedLog(logId: string | undefined) {
  return useQuery({
    queryKey: ['feed-log', logId],
    queryFn: () => FeedLogService.getById(logId as string),
    enabled: Boolean(logId)
  });
}
