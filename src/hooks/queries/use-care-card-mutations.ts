import type { CareCardInput, MedicationInput } from '@/lib/form/pet-schemas';
import CareCardService from '@/services/care-card.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['care-card', petId] });
};

export function useUpsertCareCard(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<CareCardInput>) => CareCardService.upsertCard(petId, patch),
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useUpsertMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MedicationInput & { id?: string; sortOrder?: number }) =>
      CareCardService.upsertMedication(petId, input),
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useDeleteMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (medicationId: string) => CareCardService.deleteMedication(medicationId),
    onSuccess: () => invalidate(queryClient, petId)
  });
}
