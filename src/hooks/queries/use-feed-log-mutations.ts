import { SuccessMessage } from '@/constants/enums';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FeedLogService from '@/services/feed-log.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Every mutation invalidates the same two prefixes on settle. Prefix
 * invalidation catches every cached date without enumerating them, which
 * matters because Activity holds one slot-states entry per visible day.
 */
function useInvalidateFeedData(petId: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['slot-states', petId] });
    void queryClient.invalidateQueries({ queryKey: ['feed-logs', petId] });
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
export function useLogFeed(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);

  return useMutation({
    mutationFn: (input: { loggedAt?: string; notes?: string | null; confirmed?: boolean }) =>
      FeedLogService.log(petId as string, input),
    onSettled: invalidate
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
 * deletion would add `deleted_at is null` to every read path including the slot
 * matcher and the missed-feed cron; one forgotten filter and a deleted feed
 * silently satisfies a slot.
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
