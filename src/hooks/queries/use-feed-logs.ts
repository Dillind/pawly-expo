import FeedLogService, {
  FEED_LOGS_PAGE_SIZE,
  type FeedLogsCursor
} from '@/services/feed-log.service';
import { useInfiniteQuery } from '@tanstack/react-query';

/** Activity's list. Cursor on `(logged_at, id) desc`, 30 per page. */
export function useFeedLogs(petId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['feed-logs', petId],
    queryFn: ({ pageParam }) => FeedLogService.listPage(petId as string, pageParam),
    initialPageParam: null as FeedLogsCursor | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_LOGS_PAGE_SIZE) return null;

      const last = lastPage[lastPage.length - 1];

      return { loggedAt: last.loggedAt, id: last.id };
    },
    enabled: Boolean(petId)
  });
}
