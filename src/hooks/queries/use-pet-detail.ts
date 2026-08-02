import PetService from '@/services/pet.service';
import { useQuery } from '@tanstack/react-query';

export function usePetDetail(petId: string | undefined) {
  return useQuery({
    queryKey: ['pet-detail', petId],
    queryFn: () => PetService.getDetail(petId as string),
    enabled: Boolean(petId)
  });
}
