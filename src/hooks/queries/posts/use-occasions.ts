import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import OccasionService, { type Occasion } from '@/services/occasion.service';

export function useOccasions(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.occasions(householdId),
    queryFn: () => OccasionService.list(householdId!),
    enabled: Boolean(householdId)
  });
}

export function useCreateOccasion(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.OccasionAdded,
      errorMessage: ErrorMessage.OccasionAddFailed
    },
    mutationFn: (input: { emoji: string | null; label: string | null }) =>
      OccasionService.create({ householdId: householdId!, ...input }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.occasions(householdId) })
  });
}

export function useUpdateOccasion(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.OccasionUpdated,
      errorMessage: ErrorMessage.OccasionUpdateFailed
    },
    mutationFn: (input: { id: string; emoji: string | null; label: string | null }) =>
      OccasionService.update(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.occasions(householdId) })
  });
}

// Soft. Every Post that carries the Occasion keeps it, so the posts list is invalidated too --
// nothing on a card changes, but a refetch is cheaper than reasoning about whether one might.
export function useRemoveOccasion(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.OccasionRemoved,
      errorMessage: ErrorMessage.OccasionRemoveFailed
    },
    mutationFn: (occasion: Occasion) => OccasionService.remove(occasion.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.occasions(householdId) })
  });
}
