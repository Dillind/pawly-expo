import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 500): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  // Derived rather than held in state: setting a flag from inside the effect
  // meant "debouncing" only became true a tick after the value changed, and
  // it is knowable during render anyway.
  return [debouncedValue, debouncedValue !== value];
}
