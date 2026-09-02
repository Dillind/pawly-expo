import { useInfiniteQuery } from '@tanstack/react-query';

import FeedLogService, {
  FEED_LOGS_PAGE_SIZE,
  type FeedLogsCursor
} from '@/services/feed-log.service';

/**
 * Activity's list. Cursor on `(logged_at, id) desc`, 30 per page.
 *
 * Takes every pet in the household, not one: Activity is the household's
 * history, and filtering to a single pet hid the others' feeds entirely.
 */
export function useFeedLogs(petIds: string[]) {
  return useInfiniteQuery({
    queryKey: ['feed-logs', ...[...petIds].sort()],
    queryFn: ({ pageParam }) => FeedLogService.listPage(petIds, pageParam),
    initialPageParam: null as FeedLogsCursor | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_LOGS_PAGE_SIZE) return null;

      const last = lastPage[lastPage.length - 1];

      return { loggedAt: last.loggedAt, id: last.id };
    },
    enabled: petIds.length > 0
  });
}
