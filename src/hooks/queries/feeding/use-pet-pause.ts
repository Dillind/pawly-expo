import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import FeedTimeService from '@/services/feed-time.service';

export function usePetPause(petId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: queryKeys.petPause.day(petId, date),
    queryFn: () => FeedTimeService.currentPause(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date)
  });
}

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.petPause.pet(petId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.occurrences.pet(petId) });
};

export function usePausePet(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeedsPaused,
      errorMessage: ErrorMessage.FeedsPauseFailed
    },
    mutationFn: (reason?: string | null) => FeedTimeService.pause(petId, reason),
    onSettled: () => invalidate(queryClient, petId)
  });
}

export function useResumePet(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeedsResumed,
      errorMessage: ErrorMessage.FeedsResumeFailed
    },
    mutationFn: () => FeedTimeService.resume(petId),
    onSettled: () => invalidate(queryClient, petId)
  });
}
