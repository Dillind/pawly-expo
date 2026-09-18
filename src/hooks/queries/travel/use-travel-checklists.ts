import { useQuery } from '@tanstack/react-query';

import TravelChecklistService from '@/services/travel-checklist.service';

// Two people pack one bag: a tick on the other phone must show without a reload.
const LIVE_REFETCH_MS = 10_000;

export const travelKeys = {
  all: ['travel'] as const,
  list: (householdId: string | undefined) => ['travel', 'list', householdId] as const,
  detail: (checklistId: string | undefined) => ['travel', 'checklist', checklistId] as const
};

export function useTravelChecklists(householdId: string | undefined) {
  return useQuery({
    queryKey: travelKeys.list(householdId),
    queryFn: () => TravelChecklistService.list(householdId as string),
    enabled: Boolean(householdId)
  });
}

export function useTravelChecklist(checklistId: string | undefined) {
  return useQuery({
    queryKey: travelKeys.detail(checklistId),
    queryFn: () => TravelChecklistService.get(checklistId as string),
    enabled: Boolean(checklistId),
    refetchInterval: LIVE_REFETCH_MS
  });
}
