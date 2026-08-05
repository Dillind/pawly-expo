import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { userFacingMessage } from '@/lib/errors';
import type { SlotInput } from '@/lib/form/pet-schemas';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FeedingScheduleService from '@/services/feeding-schedule.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['feeding-schedules', petId] });
  void queryClient.invalidateQueries({ queryKey: ['slot-states', petId] });
};

export function useUpsertSlot(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SlotInput & { id?: string }) =>
      FeedingScheduleService.upsertSlot(petId, input),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: (_data, input) => {
      showSuccessToast(input.id ? SuccessMessage.FeedTimeUpdated : SuccessMessage.FeedTimeAdded);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(userFacingMessage(error, ErrorMessage.FeedTimeSaveFailed));
    }
  });
}

export function useDeleteSlot(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => FeedingScheduleService.deleteSlot(slotId),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => showSuccessToast(SuccessMessage.FeedTimeRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeedTimeRemoveFailed);
    }
  });
}
