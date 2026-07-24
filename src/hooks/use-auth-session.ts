import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';

/**
 * Subscribes to Supabase auth state exactly once. Call this only from the
 * root layout — every other read of "is the user signed in" should go
 * through useAuthStore, not a second subscription.
 */
export function useAuthSession() {
  const { setSession } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session?.user.id);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session?.user.id);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);
}
