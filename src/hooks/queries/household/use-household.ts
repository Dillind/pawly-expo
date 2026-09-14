import { useEffect } from 'react';

import { useHouseholds } from '@/hooks/queries/household/use-households';
import { useActiveHouseholdStore } from '@/stores/active-household-store';

// The name and shape are unchanged from when a user could only have one, so
// every call site reads the active household without knowing there are others.
export function useHousehold() {
  const query = useHouseholds();
  const { activeHouseholdId, hasHydrated, setActiveHousehold } = useActiveHouseholdStore();

  const households = query.data;

  // The fallback covers a fresh install and a stored id for a household the
  // user has left.
  const active =
    households?.find((household) => household.id === activeHouseholdId) ?? households?.[0];

  // Never heal mid-refetch: a household just joined is not in `households` yet,
  // and healing then overwrites the id that was chosen.
  useEffect(() => {
    if (!hasHydrated || query.isFetching) return;
    if (!active || active.id === activeHouseholdId) return;

    void setActiveHousehold(active.id);
  }, [hasHydrated, query.isFetching, active, activeHouseholdId, setActiveHousehold]);

  return {
    ...query,
    // Withheld until AsyncStorage is read, or the screen visibly swaps.
    data: hasHydrated ? active : undefined,
    isLoading: query.isLoading || !hasHydrated
  };
}
