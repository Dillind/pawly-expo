import { useHouseholds } from '@/hooks/queries/household/use-households';

/**
 * One household by id, from the list already in the cache. Settings screens are
 * reached by choosing a household, so they must not read the active one.
 */
export function useHouseholdById(householdId: string | undefined) {
  const query = useHouseholds();

  return {
    ...query,
    data: query.data?.find((household) => household.id === householdId)
  };
}
