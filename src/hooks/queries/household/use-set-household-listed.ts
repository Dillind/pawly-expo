import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage } from '@/constants/enums';
import { householdsKey } from '@/hooks/queries/household/use-households';
import { showErrorToast } from '@/lib/toast';
import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdSummary } from '@/types/core';

// The one optimistic mutation in the app. `useUpdateHousehold` invalidates on
// settle, so its control snaps back until the refetch lands, which on this
// switch reads as a refusal. No success toast: the switch is the confirmation.
export function useSetHouseholdListed(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const key = householdsKey(userId);

  return useMutation({
    mutationFn: (isListed: boolean) => HouseholdService.update(householdId as string, { isListed }),
    onMutate: async (isListed) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<HouseholdSummary[]>(key);

      queryClient.setQueryData<HouseholdSummary[]>(key, (households) =>
        households?.map((household) =>
          household.id === householdId ? { ...household, isListed } : household
        )
      );

      return { previous };
    },
    onError: (error, _isListed, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);

      console.error(error);
      showErrorToast(ErrorMessage.HouseholdListedFailed);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  });
}
