import { useCallback, useEffect, useRef, useState } from 'react';

// Not TanStack's `isRefetching`: that spins on every tab switch and at the end
// of every page, when nobody pulled anything. The refreshers are in a ref
// because call sites pass an array literal.
export function usePullToRefresh(refreshers: (() => Promise<unknown>)[]) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshersRef = useRef(refreshers);

  useEffect(() => {
    refreshersRef.current = refreshers;
  }, [refreshers]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);

    void Promise.all(refreshersRef.current.map((refresh) => refresh())).finally(() =>
      setIsRefreshing(false)
    );
  }, []);

  return { isRefreshing, onRefresh };
}
