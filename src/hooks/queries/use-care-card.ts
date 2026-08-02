import CareCardService from '@/services/care-card.service';
import { useQuery } from '@tanstack/react-query';

export function useCareCard(petId: string | undefined) {
  return useQuery({
    queryKey: ['care-card', petId],
    queryFn: async () => {
      const [card, medications] = await Promise.all([
        CareCardService.getCard(petId as string),
        CareCardService.listMedications(petId as string)
      ]);
      return { card, medications };
    },
    enabled: Boolean(petId)
  });
}
