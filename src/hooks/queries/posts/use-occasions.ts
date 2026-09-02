import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import OccasionService, { type Occasion } from '@/services/occasion.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const occasionsKey = (householdId: string | undefined) => ['occasions', householdId];

export function useOccasions(householdId: string | undefined) {
  return useQuery({
    queryKey: occasionsKey(householdId),
    queryFn: () => OccasionService.list(householdId!),
    enabled: Boolean(householdId)
  });
}

export function useCreateOccasion(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { emoji: string | null; label: string | null }) =>
      OccasionService.create({ householdId: householdId!, ...input }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: occasionsKey(householdId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.OccasionAdded),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.OccasionAddFailed);
    }
  });
}

export function useUpdateOccasion(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; emoji: string | null; label: string | null }) =>
      OccasionService.update(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: occasionsKey(householdId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.OccasionUpdated),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.OccasionUpdateFailed);
    }
  });
}

/**
 * Soft. Every Post that carries the Occasion keeps it, so the posts list is
 * invalidated too -- nothing on a card changes, but a refetch is cheaper than
 * reasoning about whether one might.
 */
export function useRemoveOccasion(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occasion: Occasion) => OccasionService.remove(occasion.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: occasionsKey(householdId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.OccasionRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.OccasionRemoveFailed);
    }
  });
}
