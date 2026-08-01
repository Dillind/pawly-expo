import type { CareCardInput, MedicationInput } from '@/lib/form/pet-schemas';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['care-card', petId] });
};

const CARE_CARD_COLUMNS: Record<keyof CareCardInput, string> = {
  allergies: 'allergies',
  vetName: 'vet_name',
  vetPhone: 'vet_phone',
  emergencyVetName: 'emergency_vet_name',
  emergencyVetPhone: 'emergency_vet_phone',
  microchipNumber: 'microchip_number',
  insuranceProvider: 'insurance_provider',
  insurancePolicyNumber: 'insurance_policy_number',
  feedingNotes: 'feeding_notes',
  notes: 'notes'
};

export function useUpsertCareCard(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // Only the edited fields are written -- an upsert built from a full
    // in-memory snapshot would clobber a concurrent edit to a different
    // field made by another household member while this sheet was open.
    mutationFn: async (patch: Partial<CareCardInput>) => {
      const row: Record<string, string | null> = { pet_id: petId };
      for (const key of Object.keys(patch) as (keyof CareCardInput)[]) {
        row[CARE_CARD_COLUMNS[key]] = patch[key] || null;
      }

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
      let sortOrder = input.sortOrder;

      // New medications need a deterministic, increasing sort_order --
      // the column defaults to 0, and with two or more rows at 0 Postgres
      // makes no ordering guarantee at all. Derive the next value from the
      // current max rather than requiring every call site to supply one.
      if (!input.id && sortOrder === undefined) {
        const { data: maxRow, error: maxError } = await supabase
          .from('care_card_medications')
          .select('sort_order')
          .eq('pet_id', petId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (maxError) throw maxError;
        sortOrder = (maxRow?.sort_order ?? -1) + 1;
      }

      const row = {
        pet_id: petId,
        name: input.name,
        dose: input.dose || null,
        schedule_text: input.scheduleText || null,
        instructions: input.instructions || null,
        ...(sortOrder !== undefined ? { sort_order: sortOrder } : {})
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
