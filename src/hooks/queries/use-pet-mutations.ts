import { householdsKey } from '@/hooks/queries/use-households';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useHousehold } from '@/hooks/queries/use-household';
import PetService, { type AddPetInput } from '@/services/pet.service';
import { useAuthStore } from '@/stores/auth-store';
import { deviceTimezone } from '@/utils/timezone';
import type { Pet } from '@/types/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddPet() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();

  // Null when the user has no household yet: the RPC creates one and makes
  // them its owner, which is what lets a first pet and a fifth take one path.
  const householdId = household?.id ?? null;
  const timezone = household?.timezone ?? deviceTimezone();

  return useMutation<Pet, Error, AddPetInput>({
    mutationFn: (input) => PetService.add(input, householdId, timezone),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: householdsKey(userId) });
      // `all`, not the default `active`: the screen that adds a pet is not the
      // one that lists them, so the list's observer is often unmounted here.
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
