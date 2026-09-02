import { queryOptions, useQuery } from '@tanstack/react-query';

import { emptyCareCard } from '@/constants/care-card-fields';
import CareCardService from '@/services/care-card.service';

/**
 * Exported so sharing can fetch several pets' cards imperatively through
 * `queryClient.fetchQuery` -- a hook cannot be called once per pet in a loop,
 * and the cache should still be the one that answers.
 */
export const careCardQueryOptions = (petId: string) =>
  queryOptions({
    queryKey: ['care-card', petId],
    queryFn: async () => {
      const [card, medications, contacts] = await Promise.all([
        CareCardService.getCard(petId),
        CareCardService.listMedications(petId),
        CareCardService.listContacts(petId)
      ]);
      return { card, medications, contacts };
    }
  });

export function useCareCard(petId: string | undefined) {
  return useQuery({
    ...careCardQueryOptions(petId as string),
    enabled: Boolean(petId)
  });
}

/** Shared so the card and the editor cannot disagree on what a Pet has. */
export function useCareCardData(petId: string) {
  const query = useCareCard(petId);

  return {
    ...query,
    card: query.data?.card ?? emptyCareCard(petId),
    medications: query.data?.medications ?? [],
    contacts: query.data?.contacts ?? []
  };
}
