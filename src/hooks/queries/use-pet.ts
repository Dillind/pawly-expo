import { useHousehold } from '@/hooks/queries/use-household';
import PetService from '@/services/pet.service';
import { useQuery } from '@tanstack/react-query';

/**
 * The household's pet. The data model supports many pets per household; the
 * v1 UI shows the oldest one, which is the one onboarding created.
 */
export function usePet() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['pet', householdId],
    queryFn: () => PetService.getForHousehold(householdId as string),
    enabled: Boolean(householdId)
  });
}
