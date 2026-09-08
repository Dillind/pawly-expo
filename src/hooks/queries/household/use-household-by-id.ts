import { useHouseholds } from '@/hooks/queries/household/use-households';

/**
 * One household by id, from the list already in the cache. Settings screens are
 * reached by choosing a household, so they must not read the active one.
 *
 * `isNotFound` is separate from `isError` on purpose: a household the user has
 * left is not a failed request, and neither is one the query has not returned
 * yet. Collapsing the three into `!data` paints an error over a cold load.
 */
export function useHouseholdById(householdId: string | undefined) {
  const query = useHouseholds();
  const household = query.data?.find((item) => item.id === householdId);

  return {
    ...query,
    data: household,
    isNotFound: query.isSuccess && !household
  };
}
