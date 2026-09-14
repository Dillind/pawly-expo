import { useHousehold } from '@/hooks/queries/household/use-household';

// Derived from the active household, not fetched: `listForUser` already selects
// these columns. Anything that changes a pet's name, photo or existence must
// therefore invalidate `households`, never a `pets` key.
export function usePets() {
  const { data: household, ...query } = useHousehold();

  return { ...query, data: household?.pets };
}
