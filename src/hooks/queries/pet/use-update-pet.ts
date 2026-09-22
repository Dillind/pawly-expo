import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import PetService, { type PetPatch } from '@/services/pet.service';

type Messages = { success: string; failure: string };

// Messages are an argument: two call sites, and "Pet details updated" is not "Bio updated".
export function useUpdatePet(petId: string, messages: Messages) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: messages.success, errorMessage: messages.failure },
    mutationFn: (patch: PetPatch) => PetService.update(petId, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.petDetail(petId) });
      // The pet lists render the name from the households query.
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.all });
    }
  });
}
