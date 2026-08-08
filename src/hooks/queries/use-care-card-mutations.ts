import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import type {
  CareCardContactInput,
  CareCardInput,
  MedicationInput
} from '@/lib/form/pet-schemas';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import CareCardService from '@/services/care-card.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['care-card', petId] });
};

/** `isSilent` drops the success toast so the nine-step editor does not fire nine. */
export function useUpsertCareCard(petId: string, { isSilent = false } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<CareCardInput>) => CareCardService.upsertCard(petId, patch),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => {
      if (!isSilent) showSuccessToast(SuccessMessage.CareCardUpdated);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.CareCardUpdateFailed);
    }
  });
}

export function useUpsertContact(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CareCardContactInput & { id?: string }) =>
      CareCardService.upsertContact(petId, input),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: (_data, input) => {
      showSuccessToast(input.id ? SuccessMessage.ContactUpdated : SuccessMessage.ContactAdded);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ContactSaveFailed);
    }
  });
}

export function useDeleteContact(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) => CareCardService.deleteContact(contactId),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => showSuccessToast(SuccessMessage.ContactRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ContactRemoveFailed);
    }
  });
}

export function useUpsertMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MedicationInput & { id?: string; sortOrder?: number }) =>
      CareCardService.upsertMedication(petId, input),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: (_data, input) => {
      showSuccessToast(
        input.id ? SuccessMessage.MedicationUpdated : SuccessMessage.MedicationAdded
      );
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.MedicationSaveFailed);
    }
  });
}

export function useDeleteMedication(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (medicationId: string) => CareCardService.deleteMedication(medicationId),
    onSettled: () => invalidate(queryClient, petId),
    onSuccess: () => showSuccessToast(SuccessMessage.MedicationRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.MedicationRemoveFailed);
    }
  });
}
