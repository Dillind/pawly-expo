import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import PetPhotoService from '@/services/pet-photo.service';

export function usePetPhotos(petId: string) {
  return useQuery({
    queryKey: queryKeys.petPhotos(petId),
    queryFn: () => PetPhotoService.list(petId)
  });
}
