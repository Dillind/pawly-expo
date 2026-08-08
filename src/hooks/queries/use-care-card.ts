import { emptyCareCard } from '@/constants/care-card-fields';
import { filledFieldCount } from '@/lib/care-card-view';
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

/** Shared so the tile, the card and the editor cannot disagree on "empty". */
export function useCareCardData(petId: string) {
  const query = useCareCard(petId);

  const card = query.data?.card ?? emptyCareCard(petId);
  const medications = query.data?.medications ?? [];
  const contacts = query.data?.contacts ?? [];
  const filledCount = filledFieldCount(card);

  return {
    ...query,
    card,
    medications,
    contacts,
    isFilled: filledCount > 0 || medications.length > 0 || contacts.length > 0
  };
}
