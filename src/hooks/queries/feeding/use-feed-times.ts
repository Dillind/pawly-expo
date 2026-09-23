import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import FeedTimeService from '@/services/feed-time.service';

export function useFeedTimes(petId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.feedTimes(petId),
    queryFn: () => FeedTimeService.list(petId as string),
    enabled: Boolean(petId)
  });
}
