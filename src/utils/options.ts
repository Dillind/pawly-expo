import type { Option } from '@/types/core';

/** The label for a stored value, or null when nothing matches. */
export function optionLabel<T>(options: Option<T>[], value: T | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  return options.find((option) => option.value === value)?.label ?? null;
}
