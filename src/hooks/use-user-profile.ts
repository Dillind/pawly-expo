import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import type { UserProfile } from '@/types/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    avatarUrl: data.avatar_url
  };
}

/**
 * Fetches/caches the public.users profile row via Query, then mirrors it
 * into useAuthStore so non-React code (future RevenueCat.logIn, PostHog.identify,
 * Sentry.setUser calls) can read it without a hook.
 */
export function useUserProfile() {
  const { userId, setProfile } = useAuthStore();

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(userId as string),
    enabled: Boolean(userId)
  });

  useEffect(() => {
    setProfile(query.data);
  }, [query.data, setProfile]);

  return query;
}
