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
 * formatToParts itself is sound on Hermes and is the only zone machinery this
 * file trusts. The plugin's *static* `dayjs.tz(string, format, zone)` path is
 * NOT a safe exception -- measured on device it returns instants about fourteen
 * minutes off. Nothing here may call `.tz()` in either form; see instantAt.
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

const formatDay = ({ year, month, day }: ZonedParts): string => `${year}-${pad(month)}-${pad(day)}`;

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

/**
 * The seven days of the week that contains `day`, Monday first.
 *
 * Pure calendar arithmetic on a "YYYY-MM-DD" string, so it needs no timezone:
 * the day has already been resolved in the household's zone by the caller. The
 * steps go through `Date.UTC` for the same reason `yesterdayInTimezone` does --
 * adding 24h to an instant is wrong across a DST boundary.
 */
export function weekOf(day: string): string[] {
  const [year, month, date] = day.split('-').map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, date));
  // getUTCDay is 0 for Sunday, and the week starts on Monday here.
  const offset = (anchor.getUTCDay() + 6) % 7;

  return Array.from({ length: 7 }, (_, index) => {
    const cursor = new Date(Date.UTC(year, month - 1, date - offset + index));

    return `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`;
  });
}

/** `days` days away. Negative goes back. */
export function shiftDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, date + days));

  return `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`;
}

/** The same weekday, `weeks` weeks away. Negative goes back. */
export function shiftWeeks(day: string, weeks: number): string {
  return shiftDays(day, weeks * 7);
}

/** "M", "T", "W" ... for the week strip. Monday and Sunday are not unique. */
export function weekdayInitial(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
}

/** The date without its month or year, as the strip cell shows it. */
export function dayOfMonth(day: string): number {
  return Number(day.split('-')[2]);
}

/** "AUG 2026", the month line beside the day heading. */
export function formatMonthAndYear(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const label = new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-AU', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return label.toUpperCase();
}

/** "Monday", the day heading. */
export function formatWeekdayName(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-AU', {
    weekday: 'long',
    timeZone: 'UTC'
  });
}

/** The hour, 0-23, in the household's timezone rather than the device's. */
export function hourInTimezone(zone: string, now: Date = new Date()): number {
  return zonedParts(now, zone).hour;
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
  // Both shapes, because a stored Postgres `time` is HH:mm:ss and a value the
  // time picker just produced is HH:mm. Parsing only the first turns the second
  // into "Invalid Date" on screen.
  return dayjs(postgresTime, ['HH:mm:ss', 'HH:mm']).format('h:mm A');
}

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** Must match the interval list_alerts and unread_alert_count filter on. */
const ALERT_WINDOW_DAYS = 7;

/**
 * Whole calendar days in the household's timezone, not elapsed hours -- so
 * something logged at 11pm is one day old the next morning, rather than for a
 * further 24 hours. Negative for a future timestamp; callers clamp.
 */
export function calendarDaysAgo(
  isoTimestamp: string,
  zone: string,
  now: Date = new Date()
): number {
  const asUtcDay = ({ year, month, day }: ZonedParts) => Date.UTC(year, month - 1, day);

  return Math.round(
    (asUtcDay(zonedParts(now, zone)) - asUtcDay(zonedParts(new Date(isoTimestamp), zone))) /
      86_400_000
  );
}

/**
 * Whole calendar days in the household's timezone, not elapsed hours on the
 * device clock, so an 11pm log reads "1 day ago" the next morning rather than
 * for a further 24 hours. Under a day stays a duration.
 */
export function formatAlertTime(
  isoTimestamp: string,
  zone: string,
  now: Date = new Date()
): string {
  const minutes = Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${plural(minutes, 'minute')} ago`;

  const daysAgo = calendarDaysAgo(isoTimestamp, zone, now);

  if (daysAgo <= 0) return `${plural(Math.floor(minutes / 60), 'hour')} ago`;
  if (daysAgo < ALERT_WINDOW_DAYS) return `${plural(daysAgo, 'day')} ago`;

  // In the household's zone, like every branch above it. Formatting the Date
  // directly reads the device instead, so a row 1 Aug in Brisbane rendered as
  // "31 Jul" to anyone whose phone was behind it.
  const then = dayjs(dayInTimezone(isoTimestamp, zone), DAY_FORMAT);

  return then.format(then.year() === zonedParts(now, zone).year ? 'D MMM' : 'D MMM YYYY');
}

/** Activity's day headers: "Today", "Yesterday", then "23 July 2026". */
export function formatDayHeading(day: string, zone: string): string {
  if (day === todayInTimezone(zone)) return 'Today';
  if (day === yesterdayInTimezone(zone)) return 'Yesterday';

  return dayjs(day, DAY_FORMAT).format('D MMMM YYYY');
}

/**
 * The instant at which a wall-clock date and time occur in a zone.
 *
 * Built from Intl.formatToParts, NOT from dayjs.tz -- see the note at the top
 * of this file for why neither form of `.tz()` is safe under Hermes.
 *
 * Two passes: the first offset is read at the guessed instant, which can sit on
 * the wrong side of a DST transition. Re-reading at the corrected instant
 * settles it. A wall time inside a spring-forward gap does not exist; it
 * resolves to the instant just after the jump, which is the conventional answer.
 */
function instantAt(calendarDay: string, time: string, zone: string): Date {
  const [year, month, day] = calendarDay.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  const offsetAt = (instant: number) => {
    const parts = zonedParts(new Date(instant), zone);

    return (
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0) - instant
    );
  };

  const firstPass = wallAsUtc - offsetAt(wallAsUtc);

  return new Date(wallAsUtc - offsetAt(firstPass));
}

/**
 * Rebuilds a timestamp from the correction form's day choice and "HH:mm"
 * entry, resolved in the household's timezone. Backdating is capped at 24
 * hours, so "today or yesterday" covers every case the RLS policy admits.
 */
export function composeLoggedAt(day: 'today' | 'yesterday', time: string, zone: string): string {
  const calendarDay = day === 'today' ? todayInTimezone(zone) : yesterdayInTimezone(zone);

  return instantAt(calendarDay, time, zone).toISOString();
}

export const formatAge = (birthdate: string | null, isApproximate: boolean): string | null => {
  if (!birthdate) return null;

  const born = new Date(`${birthdate}T00:00:00`);
  const now = new Date();

  const days = Math.floor((now.getTime() - born.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) return null;

  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());

  if (now.getDate() < born.getDate()) months -= 1;
  if (months < 0) return null;

  if (months < 1) {
    if (days === 0) return 'Newborn';

    let value: string;

    if (days < 7) {
      value = plural(days, 'day');
    } else if (days < 14) {
      value = '1 week';
    } else {
      value = plural(Math.floor(days / 7), 'week');
    }

    return isApproximate ? `About ${value}` : value;
  }

  const years = Math.floor(months / 12);
  const value = years >= 1 ? plural(years, 'year') : plural(months, 'month');

  return isApproximate ? `About ${value}` : value;
};

export const formatDayAndDate = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone
  }).format(date);

/**
 * "7 August 2026". Carries the year because it stamps a shared Care Card, and a
 * sitter holding a printout needs to know whether it is from this trip or last
 * year's -- which a weekday and a month cannot tell them.
 */
export const formatDateWithYear = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone
  }).format(date);

/**
 * "2h ago", "Yesterday", "3 Aug". Absolute once a post is old enough that a
 * relative reading stops helping -- "13d ago" is arithmetic, a date is not.
 *
 * Deliberately NOT timezone-aware, unlike everything above it. A Feed Log's
 * time is a claim about the pet's day and must resolve in the household's
 * timezone; "how long ago" is a duration, and a duration is the same number of
 * hours wherever the reader is standing.
 */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const then = new Date(isoTimestamp);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);

  // Clock skew, or a post backdated a few seconds into the future by a device
  // running fast. "In 1 minute" would be absurd on something already written.
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return dayjs(then).format(then.getFullYear() === now.getFullYear() ? 'D MMM' : 'D MMM YYYY');
}

/** "Wed 2 Sep" -- the summary line of a Reminder, never a stored value. */
export function formatReminderDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  });
}

/** The device's own zone, for a display that must not wait on a household read. */
export const deviceTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;
