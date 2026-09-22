import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import AuthService from '@/services/auth.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';

// The query cache is emptied by useCacheReset once the session ends.
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { clearActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    meta: { errorMessage: ErrorMessage.AccountDeleteFailed },
    mutationFn: (confirmation: string) => AuthService.deleteAccount(confirmation),
    onSuccess: async (result) => {
      if (result.status === 'deleted') {
        await clearActiveHousehold();
        return;
      }

      if (result.status === 'last_owner') {
        queryClient.setQueryData(queryKeys.accountDeletionBlockers(userId), result.households);
      }
    }
  });
}
