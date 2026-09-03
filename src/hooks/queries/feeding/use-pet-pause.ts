import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FeedTimeService from '@/services/feed-time.service';

export function usePetPause(petId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['pet-pause', petId, date],
    queryFn: () => FeedTimeService.currentPause(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date)
  });
}

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['pet-pause', petId] });
  void queryClient.invalidateQueries({ queryKey: ['occurrences', petId] });
};

export function usePausePet(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason?: string | null) => FeedTimeService.pause(petId, reason),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => showSuccessToast(SuccessMessage.FeedsPaused),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeedsPauseFailed);
    }
  });
}

export function useResumePet(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => FeedTimeService.resume(petId),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => showSuccessToast(SuccessMessage.FeedsResumed),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeedsResumeFailed);
    }
  });
}
