import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { logError, userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      successMessage?: string;
      errorMessage?: string;
    };
  }
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Bump when a cached shape changes: an older build's cache is thrown away
// rather than rehydrated into code that no longer understands it.
const CACHE_VERSION = '2';

// The `staleTime` default of 0 left every query stale on arrival, so returning
// to Home re-ran one RPC per pet. `gcTime` must outlive `maxAge` below, or a
// restored query is evicted before anything observes it.
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta?.successMessage) showSuccessToast(mutation.meta.successMessage);
    },
    onError: (error, _variables, _context, mutation) => {
      logError(error);
      if (mutation.meta?.errorMessage) {
        showErrorToast(userFacingMessage(error, mutation.meta.errorMessage));
      }
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: DAY_MS
    }
  }
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'crumpet.queryCache',
  throttleTime: 1000
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: DAY_MS,
  buster: CACHE_VERSION
};

// The cache is per-account and AsyncStorage is not, so the next person to sign
// in on this device would paint from the last one's data.
export async function clearPersistedQueryCache() {
  queryClient.clear();

  try {
    await persister.removeClient();
  } catch (error) {
    logError(error);
  }
}
