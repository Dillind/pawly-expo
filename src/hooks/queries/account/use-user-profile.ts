import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import UserService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Fetches/caches the public.users profile row via Query, then mirrors it into
 * useAuthStore so non-React code can read it without a hook.
 */
export function useUserProfile() {
  const { userId, setProfile } = useAuthStore();

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => UserService.getProfile(userId as string),
    enabled: Boolean(userId)
  });

  useEffect(() => {
    setProfile(query.data);
  }, [query.data, setProfile]);

  return query;
}
