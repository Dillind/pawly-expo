import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import HouseholdService from '@/services/household.service';

const FIVE_MINUTES_MS = 5 * 60_000;

// Required, not optional. An ambient screen passes `useHousehold().data?.id` and says so; a
// screen under `[householdId]` passes its param. An optional argument would leave the compiler
// unable to tell the two apart, which is the trap KNOWLEDGE.md records.
export function useHouseholdMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.householdMembers.of(householdId),
    queryFn: () => HouseholdService.listMembers(householdId as string),
    enabled: Boolean(householdId),
    // Membership changes go through mutations that invalidate this key.
    staleTime: FIVE_MINUTES_MS
  });
}
