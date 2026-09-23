import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import type { CareCardContactInput, CareCardInput, MedicationInput } from '@/lib/form/pet-schemas';
import { queryKeys } from '@/lib/query-keys';
import { showSuccessToast } from '@/lib/toast';
import CareCardService from '@/services/care-card.service';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.careCard(petId) });
};

// `isSilent` drops the success toast so the nine-step editor does not fire nine.
export function useUpsertCareCard(petId: string, { isSilent = false } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.CareCardUpdateFailed },
    mutationFn: (patch: Partial<CareCardInput>) => CareCardService.upsertCard(petId, patch),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => {
      if (!isSilent) showSuccessToast(SuccessMessage.CareCardUpdated);
    }
  });
}

export function useUpsertContact(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.ContactSaveFailed },
    mutationFn: (input: CareCardContactInput & { id?: string }) =>
      CareCardService.upsertContact(petId, input),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: (_data, input) => {
      showSuccessToast(input.id ? SuccessMessage.ContactUpdated : SuccessMessage.ContactAdded);
    }
  });
}

export function useDeleteContact(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.ContactRemoved,
      errorMessage: ErrorMessage.ContactRemoveFailed
    },
    mutationFn: (contactId: string) => CareCardService.deleteContact(contactId),
    onSettled: () => invalidate(queryClient, petId)
  });
}

export function useUpsertMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.MedicationSaveFailed },
    mutationFn: (input: MedicationInput & { id?: string; sortOrder?: number }) =>
      CareCardService.upsertMedication(petId, input),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: (_data, input) => {
      showSuccessToast(
        input.id ? SuccessMessage.MedicationUpdated : SuccessMessage.MedicationAdded
      );
    }
  });
}

export function useDeleteMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.MedicationRemoved,
      errorMessage: ErrorMessage.MedicationRemoveFailed
    },
    mutationFn: (medicationId: string) => CareCardService.deleteMedication(medicationId),
    onSettled: () => invalidate(queryClient, petId)
  });
}
