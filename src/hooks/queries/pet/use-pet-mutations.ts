import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { deviceTimezone } from '@/lib/dates';
import { queryKeys } from '@/lib/query-keys';
import PetService, { type AddPetInput } from '@/services/pet.service';
import { useAuthStore } from '@/stores/auth-store';
import type { Pet } from '@/types/core';

export function useAddPet() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();

  // Null when the user has no household yet: the RPC creates one and makes
  // them its owner, which is what lets a first pet and a fifth take one path.
  const householdId = household?.id ?? null;
  const timezone = household?.timezone ?? deviceTimezone();

  return useMutation<Pet, Error, AddPetInput>({
    meta: { successMessage: SuccessMessage.PetAdded, errorMessage: ErrorMessage.PetAddFailed },
    mutationFn: (input) => PetService.add(input, householdId, timezone),
    onSettled: () => {
      // `all`, not the default `active`: the screen that adds a pet is not the
      // one that lists them, so the list's observer is often unmounted here.
      // The pet lists read from this query too, so it is the only key to bust.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.households.of(userId),
        refetchType: 'all'
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.occurrences.all,
        refetchType: 'all'
      });
    }
  });
}

export function useRemovePet() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    meta: { successMessage: SuccessMessage.PetRemoved, errorMessage: ErrorMessage.PetRemoveFailed },
    mutationFn: (petId) => PetService.remove(petId),
    onSettled: () => {
      // Home keeps rendering a removed pet otherwise.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.households.all,
        refetchType: 'all'
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.occurrences.all,
        refetchType: 'all'
      });
    }
  });
}
