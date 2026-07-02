import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 500): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return [debouncedValue, isDebouncing];
}
