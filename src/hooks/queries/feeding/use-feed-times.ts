import { useQuery } from '@tanstack/react-query';

import FeedTimeService from '@/services/feed-time.service';

export function useFeedTimes(petId: string | undefined) {
  return useQuery({
    queryKey: ['feed-times', petId],
    queryFn: () => FeedTimeService.list(petId as string),
    enabled: Boolean(petId)
  });
}
