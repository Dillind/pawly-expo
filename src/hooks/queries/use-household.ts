import { useHouseholds } from '@/hooks/queries/use-households';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useEffect } from 'react';

/**
 * The household the user is currently looking at. Two of its fields are read
 * constantly by the feed-logging feature: `timezone` (every day boundary and
 * slot calculation resolves in it, never in device-local time) and
 * `graceWindowMinutes` (the double-feed check).
 *
 * The name and shape are unchanged from when a user could only have one, so
 * every call site reads the active household without knowing there are others.
 */
export function useHousehold() {
  const query = useHouseholds();
  const { activeHouseholdId, hasHydrated, setActiveHousehold } = useActiveHouseholdStore();

  const households = query.data;

  // Falling back to the first covers both a fresh install and a stored id for a
  // household the user has since left or been removed from.
  const active =
    households?.find((household) => household.id === activeHouseholdId) ?? households?.[0];

  // Heal the stored id, but never mid-refetch: a household just joined is not
  // in `households` yet, and healing then overwrites the id that was chosen.
  useEffect(() => {
    if (!hasHydrated || query.isFetching) return;
    if (!active || active.id === activeHouseholdId) return;

    void setActiveHousehold(active.id);
  }, [hasHydrated, query.isFetching, active, activeHouseholdId, setActiveHousehold]);

  return {
    ...query,
    // Withheld until AsyncStorage has been read, or the first render picks the
    // first household and the screen visibly swaps to the stored one.
    data: hasHydrated ? active : undefined,
    isLoading: query.isLoading || !hasHydrated
  };
}
