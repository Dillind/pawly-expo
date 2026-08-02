import type { SlotInput } from '@/lib/form/pet-schemas';
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
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useDeleteSlot(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => FeedingScheduleService.deleteSlot(slotId),
    onSuccess: () => invalidate(queryClient, petId)
  });
}
