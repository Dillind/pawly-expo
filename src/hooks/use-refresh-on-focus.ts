import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Refetches a query key when the screen regains focus.
 *
 * refetchQueries({ stale: true }) rather than invalidateQueries: invalidation
 * ignores staleTime and would re-run every per-day occurrence RPC on every tab
 * switch, refetching day headers that have not changed.
 *
 * The key is held in a ref because call sites pass an array literal, which has
 * a new identity every render; putting it in the useCallback deps would
 * re-register the focus effect on every render.
 *
 * useFocusEffect comes from expo-router, which re-exports it — importing from
 * @react-navigation/native would make that a direct dependency.
 */
export function useRefreshOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef(queryKey);
  const firstTimeRef = useRef(true);

  useEffect(() => {
    queryKeyRef.current = queryKey;
  }, [queryKey]);

  useFocusEffect(
    useCallback(() => {
      // Skip the mount focus -- useQuery has already fetched by then.
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }

      void queryClient.refetchQueries({
        queryKey: queryKeyRef.current,
        stale: true,
        type: 'active'
      });
    }, [queryClient])
  );
}
