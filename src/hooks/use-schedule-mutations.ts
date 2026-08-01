import type { SlotInput } from '@/lib/form/pet-schemas';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const DUPLICATE_LABEL = '23505';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['feeding-schedules', petId] });
  void queryClient.invalidateQueries({ queryKey: ['slot-states', petId] });
};

export function useUpsertSlot(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SlotInput & { id?: string }) => {
      const row = {
        pet_id: petId,
        label: input.label,
        scheduled_time: input.scheduledTime
      };

      const { error } = input.id
        ? await supabase.from('feeding_schedules').update(row).eq('id', input.id)
        : await supabase.from('feeding_schedules').insert(row);

      // Task 2's partial unique index on (pet_id, label) surfaces here as a raw
      // Postgres error otherwise -- translate it into copy the form can show.
      if (error?.code === DUPLICATE_LABEL) {
        throw new Error(`There is already a ${input.label} feed. Edit that one instead.`);
      }

      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useDeleteSlot(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from('feeding_schedules').delete().eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}
