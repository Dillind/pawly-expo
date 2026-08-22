import { useHousehold } from '@/hooks/queries/household/use-household';

/**
 * Every pet in the household, oldest first. `usePet()` returns only the oldest
 * one; this is the surface that shows the household actually has several.
 *
 * Derived from the active household rather than fetched: `listForUser` already
 * selects the same three columns for every household's pets, so a separate
 * query re-fetched what the app had and made Home wait a round trip for it.
 * Anything that changes a pet's name, photo or existence must therefore
 * invalidate `households`, not a `pets` key.
 */
export function usePets() {
  const { data: household, ...query } = useHousehold();

  return { ...query, data: household?.pets };
}
