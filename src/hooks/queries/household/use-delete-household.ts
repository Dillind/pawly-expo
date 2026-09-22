import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import HouseholdService from '@/services/household.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';

export function useDeleteHousehold(householdId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { activeHouseholdId, clearActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    meta: { errorMessage: ErrorMessage.HouseholdDeleteFailed },
    mutationFn: (confirmedName: string) => HouseholdService.remove(householdId, confirmedName),
    onSuccess: async (result) => {
      if (result.status !== 'deleted') return;

      // Refetch first, or useHousehold heals against a stale list and writes
      // the deleted id straight back. Clearing is enough after that: the hook
      // falls back to the first household, or to none.
      await queryClient.refetchQueries({ queryKey: queryKeys.households.of(userId) });

      if (activeHouseholdId === householdId) await clearActiveHousehold();
    }
  });
}
