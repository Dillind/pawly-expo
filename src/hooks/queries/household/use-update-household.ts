import { householdsKey } from '@/hooks/queries/household/use-households';
import { ErrorMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Messages are an argument, as with `useUpdatePet`: three call sites, and
 * "Household renamed" is not "Timezone updated".
 */
export function useUpdateHousehold(householdId: string | undefined, success: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: (patch: HouseholdService.HouseholdPatch) =>
      HouseholdService.update(householdId as string, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: householdsKey(userId) });
      // The timezone and grace window decide every slot calculation, so a
      // change to either makes the whole day's derived state wrong.
      void queryClient.invalidateQueries({ queryKey: ['slot-states'] });
    },
    onSuccess: () => showSuccessToast(success),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.HouseholdUpdateFailed);
    }
  });
}
