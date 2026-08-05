import { showErrorToast, showSuccessToast } from '@/lib/toast';
import PetService, { type PetPatch } from '@/services/pet.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Messages = { success: string; failure: string };

/** Messages are an argument: two call sites, and "Pet details updated" is not "Bio updated". */
export function useUpdatePet(petId: string, messages: Messages) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: PetPatch) => PetService.update(petId, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    },
    onSuccess: () => showSuccessToast(messages.success),
    onError: (error) => {
      console.error(error);
      showErrorToast(messages.failure);
    }
  });
}
