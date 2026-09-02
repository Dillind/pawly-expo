import { useQuery } from '@tanstack/react-query';

import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function useSessionEmail() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: ['session-email', userId],
    queryFn: () => AuthService.getSessionEmail(),
    enabled: Boolean(userId)
  });
}
