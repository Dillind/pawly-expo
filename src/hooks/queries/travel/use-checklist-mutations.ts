import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import TravelChecklistService, {
  type ChecklistItem,
  type TravelChecklistDetail
} from '@/services/travel-checklist.service';

import { travelKeys } from './use-travel-checklists';

function invalidate(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: travelKeys.all });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { householdId: string; name: string; emoji: string | null }) =>
      TravelChecklistService.create(input),
    onSettled: () => invalidate(queryClient),
    // `cap_reached` is a result, not a success: the caller opens the Pro sheet.
    onSuccess: (result) => {
      if (result.status === 'created') showSuccessToast(SuccessMessage.ChecklistCreated);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ChecklistSaveFailed);
    }
  });
}

export function useRenameChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { checklistId: string; name: string; emoji: string | null }) =>
      TravelChecklistService.rename(input),
    onSettled: () => invalidate(queryClient),
    onSuccess: () => showSuccessToast(SuccessMessage.ChecklistUpdated),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ChecklistSaveFailed);
    }
  });
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checklistId: string) => TravelChecklistService.remove(checklistId),
    onSettled: () => invalidate(queryClient),
    onSuccess: () => showSuccessToast(SuccessMessage.ChecklistDeleted),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ChecklistDeleteFailed);
    }
  });
}

export function useResetChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checklistId: string) => TravelChecklistService.reset(checklistId),
    onSettled: () => invalidate(queryClient),
    onSuccess: () => showSuccessToast(SuccessMessage.ChecklistReset),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ChecklistResetFailed);
    }
  });
}

export function useAddItem(checklistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { text: string; sortOrder: number }) =>
      TravelChecklistService.addItem({ checklistId, ...input }),
    onSettled: () => invalidate(queryClient),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ChecklistItemSaveFailed);
    }
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      itemId: string;
      text?: string;
      emoji?: string | null;
      petId?: string | null;
    }) => TravelChecklistService.updateItem(input),
    onSettled: () => invalidate(queryClient),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ChecklistItemSaveFailed);
    }
  });
}

export function useRemoveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => TravelChecklistService.removeItem(itemId),
    onSettled: () => invalidate(queryClient),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ChecklistItemRemoveFailed);
    }
  });
}

// Optimistic: the tick is the loop, and a round trip before the circle fills
// reads as a dead control. No toast, the tick shows its own state.
export function useTickItem(checklistId: string) {
  const queryClient = useQueryClient();
  const key = travelKeys.detail(checklistId);

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
      console.error(error);
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      showErrorToast(ErrorMessage.ChecklistTickFailed);
    },
    onSettled: () => invalidate(queryClient)
  });
}
