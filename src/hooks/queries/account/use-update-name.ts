import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import UserService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth-store';

export function useUpdateName() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: (params: { firstName: string; lastName: string }) =>
      UserService.updateName(userId as string, params),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
    onSuccess: () => showSuccessToast(SuccessMessage.NameSaved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.NameSaveFailed);
    }
  });
}
