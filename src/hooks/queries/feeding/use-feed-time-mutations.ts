import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import type { FeedTimeInput } from '@/lib/form/pet-schemas';
import { queryKeys } from '@/lib/query-keys';
import { showSuccessToast } from '@/lib/toast';
import FeedTimeService from '@/services/feed-time.service';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.feedTimes(petId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.occurrences.pet(petId) });
};

export function useSaveFeedTime(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.FeedTimeSaveFailed },
    mutationFn: (input: FeedTimeInput & { seriesId?: string }) =>
      FeedTimeService.saveFeedTime(petId, input),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: (_data, input) => {
      showSuccessToast(
        input.seriesId ? SuccessMessage.FeedTimeUpdated : SuccessMessage.FeedTimeAdded
      );
    }
  });
}

export function useEndFeedTime(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeedTimeRemoved,
      errorMessage: ErrorMessage.FeedTimeRemoveFailed
    },
    mutationFn: (seriesId: string) => FeedTimeService.endFeedTime(petId, seriesId),
    onSettled: () => invalidate(queryClient, petId)
  });
}
