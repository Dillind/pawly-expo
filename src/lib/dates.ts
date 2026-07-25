import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// The single place dayjs is extended. utc and timezone ship with dayjs itself,
// no install needed; they rely on Intl, and this runtime already runs
// Intl.DateTimeFormat().resolvedOptions().timeZone in onboarding, which is the
// evidence the ICU data is present.
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

const DAY_FORMAT = 'YYYY-MM-DD';

/** Today's calendar day in the household's timezone, never the device's. */
export function todayInTimezone(zone: string): string {
  return dayjs().tz(zone).format(DAY_FORMAT);
}

export function yesterdayInTimezone(zone: string): string {
  return dayjs().tz(zone).subtract(1, 'day').format(DAY_FORMAT);
}

/**
 * The calendar day a timestamp belongs to, in the household's timezone. Using
 * device-local time here would land a travelling member's feeds on the wrong
 * day in Activity.
 */
export function dayInTimezone(isoTimestamp: string, zone: string): string {
  return dayjs(isoTimestamp).tz(zone).format(DAY_FORMAT);
}

/** 24-hour "HH:mm", the shape the correction form edits. */
export function timeInTimezone(isoTimestamp: string, zone: string): string {
  return dayjs(isoTimestamp).tz(zone).format('HH:mm');
}

/** Display time, e.g. "7:12 AM". */
export function formatTimeOfDay(isoTimestamp: string, zone: string): string {
  return dayjs(isoTimestamp).tz(zone).format('h:mm A');
}

/** A Postgres `time` column arrives as "07:00:00"; show it as "7:00 AM". */
export function formatScheduledTime(postgresTime: string): string {
  return dayjs(postgresTime, 'HH:mm:ss').format('h:mm A');
}

/** Activity's day headers: "Today", "Yesterday", then "23 July 2026". */
export function formatDayHeading(day: string, zone: string): string {
  if (day === todayInTimezone(zone)) return 'Today';
  if (day === yesterdayInTimezone(zone)) return 'Yesterday';

  return dayjs(day, DAY_FORMAT).format('D MMMM YYYY');
}

/**
 * Rebuilds a timestamp from the correction form's day choice and "HH:mm"
 * entry, resolved in the household's timezone. Backdating is capped at 24
 * hours, so "today or yesterday" covers every case the RLS policy admits.
 */
export function composeLoggedAt(day: 'today' | 'yesterday', time: string, zone: string): string {
  const calendarDay = day === 'today' ? todayInTimezone(zone) : yesterdayInTimezone(zone);

  return dayjs.tz(`${calendarDay} ${time}`, `${DAY_FORMAT} HH:mm`, zone).toISOString();
}
