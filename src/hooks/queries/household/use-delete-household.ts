import { useMutation, useQueryClient } from '@tanstack/react-query';

import { householdsKey } from '@/hooks/queries/household/use-households';
import HouseholdService from '@/services/household.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';

export function useDeleteHousehold(householdId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { activeHouseholdId, clearActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    mutationFn: (confirmedName: string) => HouseholdService.remove(householdId, confirmedName),
    onSuccess: async (result) => {
      if (result.status !== 'deleted') return;

      // Refetch before clearing, or useHousehold heals against a list that
      // still holds the household just deleted and writes its id straight back.
      await queryClient.refetchQueries({ queryKey: householdsKey(userId) });

      // Cleared rather than moved: useHousehold already falls back to the first
      // household, and to nothing at all when that was the last one.
      if (activeHouseholdId === householdId) await clearActiveHousehold();
    }
  });
}
