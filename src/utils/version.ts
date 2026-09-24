const VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;

export const parseVersion = (value: string): number[] | null =>
  VERSION_PATTERN.test(value) ? value.split('.').map(Number) : null;

export const compareVersions = (a: string, b: string): -1 | 0 | 1 => {
  const left = parseVersion(a);
  const right = parseVersion(b);

  if (!left || !right) throw new Error(`Not a version: "${left ? b : a}"`);

  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }

  return 0;
};

export const isNewerVersion = (a: string, b: string) => compareVersions(a, b) > 0;
