import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';

// Toasts live here, not at the call site: signing out unmounts the screen that called mutate.
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { clearActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    meta: { errorMessage: ErrorMessage.AccountDeleteFailed },
    mutationFn: AuthService.deleteAccount,
    onSuccess: async (result, { method }) => {
      if (result.status === 'deleted') {
        showSuccessToast(SuccessMessage.AccountDeleted);
        await clearActiveHousehold();
        await AuthService.endDeletedSession(method);
        return;
      }

      if (result.status === 'confirmation_mismatch') {
        showErrorToast(ErrorMessage.AccountDeleteFailed);
      }

      if (result.status === 'last_owner') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.accountDeletionPlan(userId) });
      }
    }
  });
}
