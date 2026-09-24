import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function useHandOverHousehold() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.OwnerHandedOver,
      errorMessage: ErrorMessage.OwnerHandOverFailed
    },
    mutationFn: AuthService.handOverHousehold,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDeletionPlan(userId) })
  });
}
