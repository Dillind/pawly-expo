import { useQuery } from '@tanstack/react-query';

import PetPhotoService from '@/services/pet-photo.service';

export function usePetPhotos(petId: string) {
  return useQuery({
    queryKey: ['pet-photos', petId],
    queryFn: () => PetPhotoService.list(petId)
  });
}
