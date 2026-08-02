import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';
import { useCallback, useState } from 'react';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      showSuccessToast(SuccessMessage.SignedOut);
    } catch (error) {
      showErrorToast(ErrorMessage.SignOutFailed, error instanceof Error ? error.message : 'Try again');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { logout, isLoading };
}
