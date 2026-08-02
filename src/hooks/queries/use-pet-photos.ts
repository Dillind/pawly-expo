import PetPhotoService from '@/services/pet-photo.service';
import { useQuery } from '@tanstack/react-query';

export function usePetPhotos(petId: string) {
  return useQuery({
    queryKey: ['pet-photos', petId],
    queryFn: () => PetPhotoService.list(petId)
  });
}
