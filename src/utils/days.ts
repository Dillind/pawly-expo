/** 0 is Sunday, matching Postgres `extract(dow ...)`. */
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);

/**
 * "Every day", "Weekdays", or the days themselves. A run of three or more
 * consecutive days collapses to a range, so Mon–Sat reads as one phrase rather
 * than six.
 */
export function describeDays(days: number[]): string {
  if (days.length === 0) return 'Never';
  if (days.length === 7) return 'Every day';
  if (sameSet(days, WEEKDAYS)) return 'Weekdays';
  if (sameSet(days, WEEKEND)) return 'Weekends';

  // Monday first, so a Mon–Sat run is contiguous. Sunday sorts last.
  const ordered = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));

  const runs: number[][] = [];
  for (const day of ordered) {
    const run = runs[runs.length - 1];
    const isNext = run && (run[run.length - 1] + 1) % 7 === day;

    if (isNext) run.push(day);
    else runs.push([day]);
  }

  return runs
    .map((run) =>
      run.length >= 3
        ? `${NAMES[run[0]]}–${NAMES[run[run.length - 1]]}`
        : run.map((d) => NAMES[d]).join(', ')
    )
    .join(', ');
}
