import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';

// Messages are an argument: "Household renamed" is not "Timezone updated".
export function useUpdateHousehold(householdId: string | undefined, success: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    meta: { successMessage: success, errorMessage: ErrorMessage.HouseholdUpdateFailed },
    mutationFn: (patch: HouseholdService.HouseholdPatch) =>
      HouseholdService.update(householdId as string, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.of(userId) });
      // Timezone and grace window decide every occurrence calculation.
      void queryClient.invalidateQueries({ queryKey: queryKeys.occurrences.all });
    }
  });
}
