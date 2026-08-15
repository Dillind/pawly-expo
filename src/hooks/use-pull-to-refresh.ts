import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Owns the spinner for a pull, and only for a pull.
 *
 * Binding a refresh control to TanStack's `isRefetching` looks equivalent and
 * is not: `useRefreshOnFocus` refetches on every tab switch, so the control
 * spins and pushes the content down when nobody pulled anything. Paging sets it
 * too, which spins the control every time a list reaches its end.
 *
 * The refreshers are held in a ref because call sites pass an array literal,
 * which has a new identity every render.
 */
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
