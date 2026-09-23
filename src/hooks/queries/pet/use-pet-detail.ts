import { queryOptions, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import PetService from '@/services/pet.service';

// Exported for the same reason as `careCardQueryOptions` -- see use-care-card.
export const petDetailQueryOptions = (petId: string) =>
  queryOptions({
    queryKey: queryKeys.petDetail(petId),
    queryFn: () => PetService.getDetail(petId)
  });

export function usePetDetail(petId: string | undefined) {
  return useQuery({
    ...petDetailQueryOptions(petId as string),
    enabled: Boolean(petId)
  });
}
