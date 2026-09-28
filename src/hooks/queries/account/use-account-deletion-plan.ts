import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function useAccountDeletionPlan(isEnabled: boolean) {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.accountDeletionPlan(userId),
    queryFn: AuthService.accountDeletionPlan,
    enabled: isEnabled && Boolean(userId),
    staleTime: 0
  });
}

export function usePrefetchAccountDeletionPlan() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return () =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.accountDeletionPlan(userId),
      queryFn: AuthService.accountDeletionPlan,
      staleTime: 0
    });
}
