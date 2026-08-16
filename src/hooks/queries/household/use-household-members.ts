import { useHousehold } from '@/hooks/queries/household/use-household';
import HouseholdService from '@/services/household.service';
import { useQuery } from '@tanstack/react-query';

export function useHouseholdMembers() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['household-members', householdId],
    queryFn: () => HouseholdService.listMembers(householdId as string),
    enabled: Boolean(householdId)
  });
}
