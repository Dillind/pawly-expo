import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import TravelChecklistService from '@/services/travel-checklist.service';

// Two people pack one bag: a tick on the other phone must show without a reload.
const LIVE_REFETCH_MS = 10_000;

export function useTravelChecklists(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.travel.list(householdId),
    queryFn: () => TravelChecklistService.list(householdId as string),
    enabled: Boolean(householdId)
  });
}

export function useTravelChecklist(checklistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.travel.detail(checklistId),
    queryFn: () => TravelChecklistService.get(checklistId as string),
    enabled: Boolean(checklistId),
    refetchInterval: LIVE_REFETCH_MS
  });
}
