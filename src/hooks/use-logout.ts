import { MessageType } from '@/constants/enums';
import AuthService from '@/services/auth.service';
import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      toast.success(MessageType.SignOutSuccess);
    } catch (error) {
      toast.error(MessageType.SignOutError, {
        description: error instanceof Error ? error.message : 'Try again'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { logout, isLoading };
}
