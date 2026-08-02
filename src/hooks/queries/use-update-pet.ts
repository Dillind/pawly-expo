import PetService, { type PetPatch } from '@/services/pet.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdatePet(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: PetPatch) => PetService.update(petId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    }
  });
}
