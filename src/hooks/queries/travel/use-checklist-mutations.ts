import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import TravelChecklistService, {
  type ChecklistItem,
  type TravelChecklistDetail
} from '@/services/travel-checklist.service';

function invalidate(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.travel.all });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.ChecklistSaveFailed },
    mutationFn: (input: { householdId: string; name: string; emoji: string | null }) =>
      TravelChecklistService.create(input),
    onSettled: () => invalidate(queryClient),
    // `cap_reached` is a result, not a success: the caller opens the Pro sheet.
    onSuccess: (result) => {
      if (result.status === 'created') showSuccessToast(SuccessMessage.ChecklistCreated);
    }
  });
}

export function useRenameChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.ChecklistUpdated,
      errorMessage: ErrorMessage.ChecklistSaveFailed
    },
    mutationFn: (input: { checklistId: string; name: string; emoji: string | null }) =>
      TravelChecklistService.rename(input),
    onSettled: () => invalidate(queryClient)
  });
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.ChecklistDeleted,
      errorMessage: ErrorMessage.ChecklistDeleteFailed
    },
    mutationFn: (checklistId: string) => TravelChecklistService.remove(checklistId),
    onSettled: () => invalidate(queryClient)
  });
}

export function useResetChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.ChecklistReset,
      errorMessage: ErrorMessage.ChecklistResetFailed
    },
    mutationFn: (checklistId: string) => TravelChecklistService.reset(checklistId),
    onSettled: () => invalidate(queryClient)
  });
}

export function useAddItem(checklistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.ChecklistItemSaveFailed },
    mutationFn: (input: { text: string; sortOrder: number }) =>
      TravelChecklistService.addItem({ checklistId, ...input }),
    onSettled: () => invalidate(queryClient)
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.ChecklistItemSaveFailed },
    mutationFn: (input: {
      itemId: string;
      text?: string;
      emoji?: string | null;
      petId?: string | null;
    }) => TravelChecklistService.updateItem(input),
    onSettled: () => invalidate(queryClient)
  });
}

export function useRemoveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.ChecklistItemRemoveFailed },
    mutationFn: (itemId: string) => TravelChecklistService.removeItem(itemId),
    onSettled: () => invalidate(queryClient)
  });
}

// Optimistic: the tick is the loop, and a round trip before the circle fills
// reads as a dead control. No toast, the tick shows its own state.
export function useTickItem(checklistId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.travel.detail(checklistId);

  return useMutation({
    mutationFn: (input: { itemId: string; isTicked: boolean }) =>
      TravelChecklistService.tick(input),
    onMutate: async ({ itemId, isTicked }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TravelChecklistDetail>(key);

      if (previous) {
        queryClient.setQueryData<TravelChecklistDetail>(key, {
          ...previous,
          items: previous.items.map((item: ChecklistItem) =>
            item.id === itemId ? { ...item, isTicked } : item
          )
        });
      }

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      showErrorToast(ErrorMessage.ChecklistTickFailed);
    },
    onSettled: () => invalidate(queryClient)
  });
}
