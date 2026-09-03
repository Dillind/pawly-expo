import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { SuccessMessage } from '@/constants/enums';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FeedLogService from '@/services/feed-log.service';

/**
 * Every mutation invalidates the same two prefixes on settle. Prefix
 * invalidation catches every cached date without enumerating them, which
 * matters because Activity holds one occurrences entry per visible day.
 */
function useInvalidateFeedData(petId: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['occurrences', petId] });
    void queryClient.invalidateQueries({ queryKey: ['feed-logs', petId] });
    void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  }, [queryClient, petId]);
}

/**
 * Writes are deliberately NOT optimistic. RLS can genuinely reject the insert,
 * and an optimistic row that silently rolls back is exactly the "the app said
 * the pet was fed when it wasn't" failure the product brief calls
 * trust-collapsing.
 *
 * Toasts stay at the call site here, unlike every other mutation: a
 * `double_feed` result is a success that must NOT confirm anything, because
 * nothing was written.
 */
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
    // The pet comes from the payload rather than the hook, so one instance
    // serves a Home screen holding several pets.
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['occurrences', variables.petId] });
      void queryClient.invalidateQueries({ queryKey: ['feed-logs', variables.petId] });
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    }
  });
}

export function useUpdateFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { logId: string; loggedAt?: string; notes?: string | null }) =>
      FeedLogService.update(input),
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['feed-log', variables.logId] });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.FeedUpdated),
    onError: (error) => {
      console.error(error);
      showErrorToast(feedLogErrorMessage(error));
    }
  });
}

/**
 * Hard delete — Undo and "delete this log" are the same operation. Soft
 * deletion would add `deleted_at is null` to every read path including the
 * matcher and the missed-feed cron; one forgotten filter and a deleted feed
 * silently satisfies an occurrence.
 */
export function useDeleteFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { logId: string }) => FeedLogService.remove(input.logId),
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['feed-log', variables.logId] });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.FeedDeleted),
    onError: (error) => {
      console.error(error);
      showErrorToast(feedLogErrorMessage(error));
    }
  });
}
