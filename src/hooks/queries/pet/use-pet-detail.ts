import { queryOptions, useQuery } from '@tanstack/react-query';

import PetService from '@/services/pet.service';

/** Exported for the same reason as `careCardQueryOptions` -- see use-care-card. */
export const petDetailQueryOptions = (petId: string) =>
  queryOptions({
    queryKey: ['pet-detail', petId],
    queryFn: () => PetService.getDetail(petId)
  });

export function usePetDetail(petId: string | undefined) {
  return useQuery({
    ...petDetailQueryOptions(petId as string),
    enabled: Boolean(petId)
  });
}
