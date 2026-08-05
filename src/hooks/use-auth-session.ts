import AuthService from '@/services/auth.service';
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
    void AuthService.getSessionUserId().then(setSession);

    const subscription = AuthService.onAuthStateChange(setSession);

    return () => subscription.unsubscribe();
  }, [setSession]);
}
