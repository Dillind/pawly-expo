import { useQuery } from '@tanstack/react-query';

import TravelChecklistService from '@/services/travel-checklist.service';

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
    enabled: Boolean(checklistId)
  });
}
