import { householdsKey } from '@/hooks/queries/household/use-households';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useHousehold } from '@/hooks/queries/household/use-household';
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
      // `all`, not the default `active`: the screen that adds a pet is not the
      // one that lists them, so the list's observer is often unmounted here.
      // The pet lists read from this query too, so it is the only key to bust.
      void queryClient.invalidateQueries({ queryKey: householdsKey(userId), refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: ['occurrences'], refetchType: 'all' });
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
      // Home and Activity both keep rendering a removed pet otherwise.
      void queryClient.invalidateQueries({ queryKey: ['households'], refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: ['occurrences'], refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: ['feed-logs'], refetchType: 'all' });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.PetRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.PetRemoveFailed);
    }
  });
}
