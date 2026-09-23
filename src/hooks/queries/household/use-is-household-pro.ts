import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import TravelChecklistService from '@/services/travel-checklist.service';

export function useIsHouseholdPro(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.householdIsPro(householdId),
    queryFn: () => TravelChecklistService.isHouseholdPro(householdId as string),
    enabled: Boolean(householdId)
  });
}
