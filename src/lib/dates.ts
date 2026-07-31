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

/**
 * Every zone-aware read below goes through Intl.DateTimeFormat.formatToParts
 * rather than dayjs's `.tz()`. This is not a style preference -- dayjs's
 * instance `.tz()` is broken under Hermes and fails silently.
 *
 * The plugin derives a zone's offset by formatting the date with
 * `toLocaleString('en-US', { timeZone })` and re-parsing the result with
 * `new Date(...)`. Hermes produces the string correctly ("7/25/2026,
 * 11:38:00 PM") but its Date constructor only parses ISO 8601, so the
 * re-parse yields Invalid Date. The offset becomes NaN, and the plugin's
 * `if (!Number(s))` guard -- true for NaN, not just 0 -- falls through to
 * `.utcOffset(0)`. Result: every `.tz()` call returns UTC, with no error.
 *
 * formatToParts itself is sound on Hermes and is what the plugin's *static*
 * `dayjs.tz(string, format, zone)` path already uses, which is why
 * composeLoggedAt below writes the right instant while reads were all UTC.
 */
const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(zone: string): Intl.DateTimeFormat {
  const cached = zonedFormatters.get(zone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  zonedFormatters.set(zone, formatter);

  return formatter;
}

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(date: Date, zone: string): ZonedParts {
  const values: Record<string, number> = {};

  for (const part of zonedFormatter(zone).formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = parseInt(part.value, 10);
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    // `hour12: false` renders midnight as hour 24 on some engines, never 0.
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

const formatDay = ({ year, month, day }: ZonedParts): string =>
  `${year}-${pad(month)}-${pad(day)}`;

/** Today's calendar day in the household's timezone, never the device's. */
export function todayInTimezone(zone: string): string {
  return formatDay(zonedParts(new Date(), zone));
}

export function yesterdayInTimezone(zone: string): string {
  const today = zonedParts(new Date(), zone);
  // Step back a calendar day on the zone's own wall-clock date, not by
  // subtracting 24h from the instant -- across a DST boundary those differ.
  const previous = new Date(Date.UTC(today.year, today.month - 1, today.day - 1));

  return `${previous.getUTCFullYear()}-${pad(previous.getUTCMonth() + 1)}-${pad(previous.getUTCDate())}`;
}

/**
 * The calendar day a timestamp belongs to, in the household's timezone. Using
 * device-local time here would land a travelling member's feeds on the wrong
 * day in Activity.
 */
export function dayInTimezone(isoTimestamp: string, zone: string): string {
  return formatDay(zonedParts(new Date(isoTimestamp), zone));
}

/** 24-hour "HH:mm", the shape the correction form edits. */
export function timeInTimezone(isoTimestamp: string, zone: string): string {
  const { hour, minute } = zonedParts(new Date(isoTimestamp), zone);

  return `${pad(hour)}:${pad(minute)}`;
}

/** Display time, e.g. "7:12 AM". */
export function formatTimeOfDay(isoTimestamp: string, zone: string): string {
  const { hour, minute } = zonedParts(new Date(isoTimestamp), zone);

  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
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
 *
 * Keeps dayjs.tz -- the *static* form, given a string, which resolves the
 * offset through formatToParts and is unaffected by the Hermes Date-parsing
 * fault described above. Do not rewrite it to `dayjs(...).tz(zone)`.
 */
export function composeLoggedAt(day: 'today' | 'yesterday', time: string, zone: string): string {
  const calendarDay = day === 'today' ? todayInTimezone(zone) : yesterdayInTimezone(zone);

  return dayjs.tz(`${calendarDay} ${time}`, `${DAY_FORMAT} HH:mm`, zone).toISOString();
}

export const formatAge = (birthdate: string | null, isApproximate: boolean): string | null => {
  if (!birthdate) return null;

  const born = new Date(`${birthdate}T00:00:00`);
  const now = new Date();

  const days = Math.floor((now.getTime() - born.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) return null;

  if (days < 28) {
    if (days === 0) return 'Newborn';

    let value: string;

    if (days < 7) {
      value = `${days} day${days === 1 ? '' : 's'}`;
    } else if (days < 14) {
      value = '1 week';
    } else {
      const weeks = Math.floor(days / 7);
      value = `${weeks} weeks`;
    }

    return isApproximate ? `About ${value}` : value;
  }

  let months =
    (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());

  if (now.getDate() < born.getDate()) months -= 1;
  if (months < 0) return null;

  const years = Math.floor(months / 12);
  const unit = years >= 1 ? years : months;
  const noun = years >= 1 ? 'year' : 'month';
  const value = `${unit} ${noun}${unit === 1 ? '' : 's'}`;

  return isApproximate ? `About ${value}` : value;
};

export const formatDayAndDate = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone
  }).format(date);
