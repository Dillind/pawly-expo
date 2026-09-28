import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function useSignInMethod() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.signInMethod(userId),
    queryFn: AuthService.getSignInMethod,
    enabled: Boolean(userId)
  });
}
