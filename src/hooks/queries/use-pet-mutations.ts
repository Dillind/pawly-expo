import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import PetService, { type AddPetInput } from '@/services/pet.service';
import type { Pet } from '@/types/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddPet() {
  const queryClient = useQueryClient();

  return useMutation<Pet, Error, AddPetInput>({
    mutationFn: (input) => PetService.add(input),
    onSettled: () => {
      // Prefix key, and `all` rather than the default `active`: the screen that
      // added the pet is not the screen that lists them, so the list's observer
      // may well be unmounted at this moment and would otherwise stay stale.
      void queryClient.invalidateQueries({ queryKey: ['pets'], refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: ['slot-states'], refetchType: 'all' });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.PetAdded),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.PetAddFailed);
    }
  });
}

export function useRemovePet() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (petId) => PetService.remove(petId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pets'], refetchType: 'all' });
      // Home and Activity both keep rendering a removed pet otherwise.
      void queryClient.invalidateQueries({ queryKey: ['slot-states'], refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: ['feed-logs'], refetchType: 'all' });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.PetRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.PetRemoveFailed);
    }
  });
}
