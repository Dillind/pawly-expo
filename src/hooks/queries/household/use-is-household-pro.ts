import { useQuery } from '@tanstack/react-query';

import TravelChecklistService from '@/services/travel-checklist.service';

export function useIsHouseholdPro(householdId: string | undefined) {
  return useQuery({
    queryKey: ['household', 'pro', householdId],
    queryFn: () => TravelChecklistService.isHouseholdPro(householdId as string),
    enabled: Boolean(householdId)
  });
}
