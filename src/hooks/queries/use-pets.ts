import { useHousehold } from '@/hooks/queries/use-household';
import PetService from '@/services/pet.service';
import { useQuery } from '@tanstack/react-query';

/**
 * Every pet in the household, oldest first. `usePet()` returns only the oldest
 * one; this is the surface that shows the household actually has several.
 */
export function usePets() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['pets', householdId],
    queryFn: () => PetService.listForHousehold(householdId as string),
    enabled: Boolean(householdId)
  });
}
