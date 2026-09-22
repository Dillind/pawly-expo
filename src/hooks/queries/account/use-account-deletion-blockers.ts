import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function useAccountDeletionBlockers(isEnabled: boolean) {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.accountDeletionBlockers(userId),
    queryFn: AuthService.accountDeletionBlockers,
    enabled: isEnabled && Boolean(userId),
    staleTime: 0
  });
}
