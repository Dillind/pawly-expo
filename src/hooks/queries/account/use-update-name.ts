import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import UserService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth-store';

export function useUpdateName() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    meta: { successMessage: SuccessMessage.NameSaved, errorMessage: ErrorMessage.NameSaveFailed },
    mutationFn: (params: { firstName: string; lastName: string }) =>
      UserService.updateName(userId as string, params),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
  });
}
