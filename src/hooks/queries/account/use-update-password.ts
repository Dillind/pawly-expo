import { useMutation } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';

export function useUpdatePassword() {
  return useMutation({
    meta: { errorMessage: ErrorMessage.PasswordUpdateFailed },
    mutationFn: async (params: { currentPassword: string; password: string }) => {
      if (!(await AuthService.verifyPassword(params.currentPassword))) return 'wrong_password';
      await AuthService.updatePassword({ password: params.password });
      return 'updated';
    },
    onSuccess: (status) => {
      if (status === 'updated') showSuccessToast(SuccessMessage.PasswordUpdated);
    }
  });
}
