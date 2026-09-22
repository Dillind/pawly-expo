import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import UserService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth-store';

export function useUserStats() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.userStats.of(userId),
    queryFn: () => UserService.getStats(userId as string),
    enabled: Boolean(userId)
  });
}
