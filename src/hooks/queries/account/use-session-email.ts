import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function useSessionEmail() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.sessionEmail(userId),
    queryFn: () => AuthService.getSessionEmail(),
    enabled: Boolean(userId)
  });
}
