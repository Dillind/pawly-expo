import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// The single place dayjs is extended.
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

const DAY_FORMAT = 'YYYY-MM-DD';

// Nothing in this file may call dayjs `.tz()` in either form: it returns UTC
// under Hermes and never throws. Zone reads go through formatToParts.
// See docs/KNOWLEDGE.md.
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

export function todayInTimezone(zone: string): string {
  return formatDay(zonedParts(new Date(), zone));
}

export function yesterdayInTimezone(zone: string): string {
  const today = zonedParts(new Date(), zone);
  // Across a DST boundary, stepping the wall-clock date and subtracting 24h
  // from the instant give different answers.
  const previous = new Date(Date.UTC(today.year, today.month - 1, today.day - 1));

  return `${previous.getUTCFullYear()}-${pad(previous.getUTCMonth() + 1)}-${pad(previous.getUTCDate())}`;
}

// Device-local time here lands a travelling member's feeds on the wrong day.
export function dayInTimezone(isoTimestamp: string, zone: string): string {
  return formatDay(zonedParts(new Date(isoTimestamp), zone));
}

// Needs no timezone: the caller has already resolved `day` in the household's
// zone. Date.UTC for the DST reason above.
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

export function shiftDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, date + days));

  return `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`;
}

export function shiftWeeks(day: string, weeks: number): string {
  return shiftDays(day, weeks * 7);
}

export function weekdayInitial(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
}

export function dayOfMonth(day: string): number {
  return Number(day.split('-')[2]);
}

export function formatMonthAndYear(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const label = new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-AU', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return label.toUpperCase();
}

export function formatWeekdayName(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-AU', {
    weekday: 'long',
    timeZone: 'UTC'
  });
}

export function hourInTimezone(zone: string, now: Date = new Date()): number {
  return zonedParts(now, zone).hour;
}

export function timeInTimezone(isoTimestamp: string, zone: string): string {
  const { hour, minute } = zonedParts(new Date(isoTimestamp), zone);

  return `${pad(hour)}:${pad(minute)}`;
}

export function formatTimeOfDay(isoTimestamp: string, zone: string): string {
  const { hour, minute } = zonedParts(new Date(isoTimestamp), zone);

  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function formatScheduledTime(postgresTime: string): string {
  // A stored Postgres `time` is HH:mm:ss; a value the picker just produced is
  // HH:mm. Parsing only the first renders the second as "Invalid Date".
  return dayjs(postgresTime, ['HH:mm:ss', 'HH:mm']).format('h:mm A');
}

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

// Must match the interval list_alerts and unread_alert_count filter on.
const ALERT_WINDOW_DAYS = 7;

// Whole calendar days, not elapsed hours, so an 11pm log is one day old the
// next morning. Negative for a future timestamp; callers clamp.
function calendarDaysAgo(isoTimestamp: string, zone: string, now: Date = new Date()): number {
  const asUtcDay = ({ year, month, day }: ZonedParts) => Date.UTC(year, month - 1, day);

  return Math.round(
    (asUtcDay(zonedParts(now, zone)) - asUtcDay(zonedParts(new Date(isoTimestamp), zone))) /
      86_400_000
  );
}

// Whole calendar days, not elapsed hours. Under a day stays a duration.
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

  // Formatting the Date directly reads the device zone, which rendered a row
  // dated 1 Aug in Brisbane as "31 Jul" to anyone whose phone was behind.
  const then = dayjs(dayInTimezone(isoTimestamp, zone), DAY_FORMAT);

  return then.format(then.year() === zonedParts(now, zone).year ? 'D MMM' : 'D MMM YYYY');
}

export function formatDayHeading(day: string, zone: string): string {
  if (day === todayInTimezone(zone)) return 'Today';
  if (day === yesterdayInTimezone(zone)) return 'Yesterday';

  return dayjs(day, DAY_FORMAT).format('D MMMM YYYY');
}

// Two passes: the first offset is read at the guessed instant, which can sit on
// the wrong side of a DST transition. A wall time inside a spring-forward gap
// resolves to the instant just after the jump.
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

// Backdating is capped at 24 hours, so "today or yesterday" covers every case
// the RLS policy admits.
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

// Carries the year because it stamps a printed Care Card, and a sitter cannot
// tell this trip from last year's without it.
export const formatDateWithYear = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone
  }).format(date);

// Deliberately NOT timezone-aware, unlike everything above. "How long ago" is a
// duration, and a duration is the same wherever the reader stands.
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const then = new Date(isoTimestamp);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);

  // A device running fast can write a post a few seconds into the future.
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return dayjs(then).format(then.getFullYear() === now.getFullYear() ? 'D MMM' : 'D MMM YYYY');
}

export function formatReminderDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  });
}

// The device's own zone, for a display that must not wait on a household read.
export const deviceTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export type ApproximateAge = { years: number; months: number };

// Snapped to the first of the month, because the member said "about three".
export function birthdateFromAge({ years, months }: ApproximateAge, now = new Date()): string {
  return dayjs(now)
    .date(1)
    .subtract(years * 12 + months, 'month')
    .format(DAY_FORMAT);
}

export function ageFromBirthdate(birthdate: string, now = new Date()): ApproximateAge {
  const [year, month] = birthdate.split('-').map(Number);
  const today = dayjs(now);

  const total = Math.max(0, (today.year() - year) * 12 + (today.month() + 1 - month));

  return { years: Math.floor(total / 12), months: total % 12 };
}

export function formatBirthMonth(birthdate: string): string {
  const [year, month] = birthdate.split('-').map(Number);
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return `Born around ${label}`;
}

export const formatDayAndShortMonth = (isoTimestamp: string, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: timezone }).format(
    new Date(isoTimestamp)
  );
