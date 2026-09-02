import { useCallback, useState } from 'react';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      showSuccessToast(SuccessMessage.SignedOut);
    } catch (error) {
      showErrorToast(ErrorMessage.SignOutFailed, userFacingMessage(error, 'Try again'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { logout, isLoading };
}
