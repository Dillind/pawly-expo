import { clearPersistedQueryCache } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect, useRef } from 'react';

/**
 * Empties the query cache, in memory and on disk, when a signed-in session
 * ends. Sign-out is not the only way that happens — a revoked or expired token
 * arrives through onAuthStateChange — so this watches the status rather than
 * living in useLogout.
 */
export function useCacheReset() {
  const { status } = useAuthStore();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (status === 'signedIn') {
      wasSignedIn.current = true;
      return;
    }

    if (status !== 'signedOut' || !wasSignedIn.current) return;

    wasSignedIn.current = false;
    void clearPersistedQueryCache();
  }, [status]);
}
