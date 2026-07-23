import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

async function fetchHasHousehold(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) throw error;

  return data.length > 0;
}

/**
 * Gates the (protected) area between (onboarding) and (tabs). Deliberately
 * separate from useAuthStore -- "has a household" is server data, not
 * session identity, same reasoning as useUserProfile in the auth work.
 */
export function useHasHousehold() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ['has-household', userId],
    queryFn: () => fetchHasHousehold(userId as string),
    enabled: Boolean(userId)
  });
}
