import { useMutation } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { logError, userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (password: string) => AuthService.updatePassword({ password }),
    onSuccess: () => showSuccessToast(SuccessMessage.PasswordUpdated),
    onError: (error) => {
      logError(error);
      showErrorToast(ErrorMessage.PasswordUpdateFailed, userFacingMessage(error, 'Try again'));
    }
  });
}
