import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

// refetchQueries({ stale: true }), not invalidateQueries: invalidation ignores
// staleTime and re-runs every per-day occurrence RPC on each tab switch. The key
// is in a ref because call sites pass an array literal.
export function useRefreshOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef(queryKey);
  const firstTimeRef = useRef(true);

  useEffect(() => {
    queryKeyRef.current = queryKey;
  }, [queryKey]);

  useFocusEffect(
    useCallback(() => {
      // Skip the mount focus: useQuery has already fetched by then.
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
