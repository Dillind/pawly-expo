import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import HouseholdService, { type CreateHouseholdInput } from '@/services/household.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';

// The new household becomes the active one, because the flow ends on its own
// summary and Home behind it has to be the household just built.
export function useCreateHouseholdWithPet() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { setActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    meta: { errorMessage: ErrorMessage.HouseholdCreateFailed },
    mutationFn: (input: CreateHouseholdInput) => HouseholdService.createWithPet(input),
    onSuccess: async (result) => {
      if (result.status !== 'created') return;

      // Refetch first: useHousehold heals an id it cannot find by falling back
      // to the first household, so a stale list overwrites this.
      await queryClient.refetchQueries({ queryKey: queryKeys.households.of(userId) });
      await setActiveHousehold(result.householdId);
    }
  });
}
