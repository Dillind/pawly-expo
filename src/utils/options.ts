import type { Option } from '@/types/core';

export function optionLabel<T>(options: Option<T>[], value: T | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  return options.find((option) => option.value === value)?.label ?? null;
}
