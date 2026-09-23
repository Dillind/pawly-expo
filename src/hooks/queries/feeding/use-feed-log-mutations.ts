import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { SuccessMessage } from '@/constants/enums';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast } from '@/lib/toast';
import FeedLogService from '@/services/feed-log.service';

// Prefix invalidation catches every cached date without enumerating them: Home
// holds one occurrences entry per visible day.
function useInvalidateFeedData(petId: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.occurrences.pet(petId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.userStats.all });
  }, [queryClient, petId]);
}

// Not optimistic: RLS can reject the insert, and a row that silently rolls back
// is the "the app said the pet was fed when it wasn't" failure. Toasts stay at
// the call site, because a `double_feed` success must confirm nothing.
export function useLogFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      petId,
      ...input
    }: {
      petId: string;
      loggedAt?: string;
      notes?: string | null;
      confirmed?: boolean;
      seriesId?: string | null;
      occurrenceDate?: string | null;
    }) => FeedLogService.log(petId, input),
    // The pet comes from the payload, so one instance serves several pets.
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.occurrences.pet(variables.petId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats.all });
    }
  });
}

export function useUpdateFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: SuccessMessage.FeedUpdated },
    mutationFn: (input: { logId: string; loggedAt?: string; notes?: string | null }) =>
      FeedLogService.update(input),
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedLog(variables.logId) });
    },
    onError: (error) => {
      showErrorToast(feedLogErrorMessage(error));
    }
  });
}

// Hard delete: soft deletion would add `deleted_at is null` to every read path,
// and one forgotten filter lets a deleted feed satisfy an occurrence.
export function useDeleteFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: SuccessMessage.FeedDeleted },
    mutationFn: (input: { logId: string }) => FeedLogService.remove(input.logId),
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedLog(variables.logId) });
    },
    onError: (error) => {
      showErrorToast(feedLogErrorMessage(error));
    }
  });
}
