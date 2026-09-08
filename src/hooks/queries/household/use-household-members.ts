import { useQuery } from '@tanstack/react-query';

import { useHousehold } from '@/hooks/queries/household/use-household';
import HouseholdService from '@/services/household.service';

const FIVE_MINUTES_MS = 5 * 60_000;

/**
 * Pass a `householdId` on any screen the user reached by choosing a household,
 * rather than by being in it. The active household is only the right answer for
 * Home and the pet screens, which follow the switcher.
 */
export function useHouseholdMembers(householdId?: string) {
  const { data: household } = useHousehold();
  const id = householdId ?? household?.id;

  return useQuery({
    queryKey: ['household-members', id],
    queryFn: () => HouseholdService.listMembers(id as string),
    enabled: Boolean(id),
    // Membership changes go through mutations that invalidate this key.
    staleTime: FIVE_MINUTES_MS
  });
}
