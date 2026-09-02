import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { userFacingMessage } from '@/lib/errors';
import type { FeedTimeInput } from '@/lib/form/pet-schemas';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FeedTimeService from '@/services/feed-time.service';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['feed-times', petId] });
  void queryClient.invalidateQueries({ queryKey: ['occurrences', petId] });
};

export function useSaveFeedTime(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FeedTimeInput & { seriesId?: string }) =>
      FeedTimeService.saveFeedTime(petId, input),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: (_data, input) => {
      showSuccessToast(
        input.seriesId ? SuccessMessage.FeedTimeUpdated : SuccessMessage.FeedTimeAdded
      );
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(userFacingMessage(error, ErrorMessage.FeedTimeSaveFailed));
    }
  });
}

export function useEndFeedTime(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => FeedTimeService.endFeedTime(petId, seriesId),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => showSuccessToast(SuccessMessage.FeedTimeRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeedTimeRemoveFailed);
    }
  });
}
