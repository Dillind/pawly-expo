import { useHouseholds } from '@/hooks/queries/household/use-households';

// Settings screens are reached by choosing a household, so they must not read the
// active one. `isNotFound` is separate from `isError`: collapsing the two into
// `!data` paints an error over a cold load.
export function useHouseholdById(householdId: string | undefined) {
  const query = useHouseholds();
  const household = query.data?.find((item) => item.id === householdId);

  return {
    ...query,
    data: household,
    isNotFound: query.isSuccess && !household
  };
}
