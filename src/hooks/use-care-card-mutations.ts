import type { CareCardInput, MedicationInput } from '@/lib/form/pet-schemas';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['care-card', petId] });
};

export function useUpsertCareCard(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CareCardInput) => {
      const row = {
        pet_id: petId,
        allergies: input.allergies,
        vet_name: input.vetName,
        vet_phone: input.vetPhone,
        emergency_vet_name: input.emergencyVetName,
        emergency_vet_phone: input.emergencyVetPhone,
        microchip_number: input.microchipNumber,
        insurance_provider: input.insuranceProvider,
        insurance_policy_number: input.insurancePolicyNumber,
        feeding_notes: input.feedingNotes,
        notes: input.notes
      };

      const { error } = await supabase.from('care_cards').upsert(row, { onConflict: 'pet_id' });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useUpsertMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MedicationInput & { id?: string; sortOrder?: number }) => {
      const row = {
        pet_id: petId,
        name: input.name,
        dose: input.dose,
        schedule_text: input.scheduleText,
        instructions: input.instructions,
        ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {})
      };

      const { error } = input.id
        ? await supabase.from('care_card_medications').update(row).eq('id', input.id)
        : await supabase.from('care_card_medications').insert(row);

      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useDeleteMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) => {
      const { error } = await supabase
        .from('care_card_medications')
        .delete()
        .eq('id', medicationId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}
