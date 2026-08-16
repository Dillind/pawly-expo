import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

export function useSessionEmail() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: ['session-email', userId],
    queryFn: () => AuthService.getSessionEmail(),
    enabled: Boolean(userId)
  });
}
