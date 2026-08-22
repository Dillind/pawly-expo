import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Bump when a cached shape changes. A stored cache written by an older build is
 * thrown away rather than rehydrated into code that no longer understands it.
 */
const CACHE_VERSION = '1';

/**
 * `staleTime` is 30s across the board, with longer settings on the few queries
 * that rarely change (set on the hooks themselves). The default of 0 left every
 * query stale the moment it landed, so returning to Home re-ran one RPC per pet
 * every time.
 *
 * `gcTime` has to outlive `maxAge` below, or a restored query is evicted before
 * anything observes it and painting from cache does nothing.
 */
export const queryClient = new QueryClient({
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

/**
 * The cache is per-account and AsyncStorage is not, so signing out has to take
 * the stored copy with it. Otherwise the next person to sign in on this device
 * paints from the last one's data before their own arrives.
 */
export async function clearPersistedQueryCache() {
  queryClient.clear();

  try {
    await persister.removeClient();
  } catch (error) {
    console.error(error);
  }
}
