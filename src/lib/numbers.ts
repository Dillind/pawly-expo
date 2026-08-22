/**
 * Compact above four digits, so a long-running Household's feed count cannot
 * push a stat column wide enough to break the row. One decimal, and a trailing
 * `.0` is dropped: 1200 is `1.2k`, 2000 is `2k`.
 */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);

  const thousands = value / 1000;
  const rounded = Math.floor(thousands * 10) / 10;

  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
}
