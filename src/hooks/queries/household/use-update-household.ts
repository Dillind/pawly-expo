import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage } from '@/constants/enums';
import { householdsKey } from '@/hooks/queries/household/use-households';
import { userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';

// Messages are an argument: "Household renamed" is not "Timezone updated".
export function useUpdateHousehold(householdId: string | undefined, success: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: (patch: HouseholdService.HouseholdPatch) =>
      HouseholdService.update(householdId as string, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: householdsKey(userId) });
      // Timezone and grace window decide every occurrence calculation.
      void queryClient.invalidateQueries({ queryKey: ['occurrences'] });
    },
    onSuccess: () => showSuccessToast(success),
    onError: (error) => {
      console.error(error);
      // Without this the service's handle copy is swallowed by the generic
      // fallback and the Owner is told nothing.
      showErrorToast(userFacingMessage(error, ErrorMessage.HouseholdUpdateFailed));
    }
  });
}
