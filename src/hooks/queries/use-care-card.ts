import CareCardService from '@/services/care-card.service';
import { queryOptions, useQuery } from '@tanstack/react-query';

/**
 * Exported so sharing can fetch several pets' cards imperatively through
 * `queryClient.fetchQuery` -- a hook cannot be called once per pet in a loop,
 * and the cache should still be the one that answers.
 */
export const careCardQueryOptions = (petId: string) =>
  queryOptions({
    queryKey: ['care-card', petId],
    queryFn: async () => {
      const [card, medications] = await Promise.all([
        CareCardService.getCard(petId),
        CareCardService.listMedications(petId)
      ]);
      return { card, medications };
    }
  });

export function useCareCard(petId: string | undefined) {
  return useQuery({
    ...careCardQueryOptions(petId as string),
    enabled: Boolean(petId)
  });
}
