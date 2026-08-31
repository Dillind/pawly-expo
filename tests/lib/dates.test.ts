import {
  formatAlertTime,
  composeLoggedAt,
  dayInTimezone,
  formatAge,
  formatDayHeading,
  formatScheduledTime,
  formatTimeOfDay,
  timeInTimezone,
  todayInTimezone,
  yesterdayInTimezone,
  weekOf,
  weekdayInitial,
  dayOfMonth,
  formatMonthAndYear,
  formatWeekdayName
} from '@/lib/dates';

const MELBOURNE = 'Australia/Melbourne';
const LONDON = 'Europe/London';

describe('dayInTimezone', () => {
  it('resolves the calendar day in the household zone, not the device zone', () => {
    // 22:30 UTC on 1 July is already 08:30 on 2 July in Melbourne.
    expect(dayInTimezone('2026-07-01T22:30:00Z', MELBOURNE)).toBe('2026-07-02');
    expect(dayInTimezone('2026-07-01T22:30:00Z', LONDON)).toBe('2026-07-01');
  });

  it('puts a feed logged just after local midnight on the new day', () => {
    expect(dayInTimezone('2026-07-01T14:05:00Z', MELBOURNE)).toBe('2026-07-02');
  });
});

describe('timeInTimezone', () => {
  it('returns 24-hour HH:mm in the household zone', () => {
    expect(timeInTimezone('2026-07-01T22:30:00Z', MELBOURNE)).toBe('08:30');
  });

  it('pads single-digit hours and minutes', () => {
    expect(timeInTimezone('2026-06-30T21:05:00Z', MELBOURNE)).toBe('07:05');
  });
});

describe('formatTimeOfDay', () => {
  it('renders midnight and noon as 12, not 0', () => {
    expect(formatTimeOfDay('2026-07-01T14:00:00Z', MELBOURNE)).toBe('12:00 AM');
    expect(formatTimeOfDay('2026-07-02T02:00:00Z', MELBOURNE)).toBe('12:00 PM');
  });

  it('splits AM and PM either side of noon', () => {
    expect(formatTimeOfDay('2026-06-30T21:00:00Z', MELBOURNE)).toBe('7:00 AM');
    expect(formatTimeOfDay('2026-07-01T07:00:00Z', MELBOURNE)).toBe('5:00 PM');
  });
});

describe('formatScheduledTime', () => {
  it('turns a Postgres time column into a display time', () => {
    expect(formatScheduledTime('07:00:00')).toBe('7:00 AM');
    expect(formatScheduledTime('17:30:00')).toBe('5:30 PM');
    expect(formatScheduledTime('00:15:00')).toBe('12:15 AM');
  });

  // The time picker stores HH:mm, so the Reminder Tray's summary hands it a
  // value with no seconds. Parsing only HH:mm:ss rendered "Invalid Date".
  it('accepts a time with no seconds', () => {
    expect(formatScheduledTime('09:00')).toBe('9:00 AM');
    expect(formatScheduledTime('17:30')).toBe('5:30 PM');
  });
});

describe('yesterdayInTimezone', () => {
  it('steps back one calendar day, not 24 hours', () => {
    const today = todayInTimezone(MELBOURNE);
    const yesterday = yesterdayInTimezone(MELBOURNE);

    const gap =
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${yesterday}T00:00:00Z`)) / 86_400_000;

    // Exactly one calendar day apart even across a DST boundary, which is the
    // case subtracting 24h from the instant gets wrong.
    expect(gap).toBe(1);
  });
});

describe('formatDayHeading', () => {
  it('names today and yesterday rather than dating them', () => {
    expect(formatDayHeading(todayInTimezone(MELBOURNE), MELBOURNE)).toBe('Today');
    expect(formatDayHeading(yesterdayInTimezone(MELBOURNE), MELBOURNE)).toBe('Yesterday');
  });

  it('dates anything older', () => {
    expect(formatDayHeading('2026-07-23', MELBOURNE)).toBe('23 July 2026');
  });
});

describe('composeLoggedAt', () => {
  it('resolves the picked time in the household zone', () => {
    const iso = composeLoggedAt('today', '07:00', MELBOURNE);

    expect(timeInTimezone(iso, MELBOURNE)).toBe('07:00');
    expect(dayInTimezone(iso, MELBOURNE)).toBe(todayInTimezone(MELBOURNE));
  });

  it('lands on yesterday when yesterday is chosen', () => {
    const iso = composeLoggedAt('yesterday', '18:30', MELBOURNE);

    expect(dayInTimezone(iso, MELBOURNE)).toBe(yesterdayInTimezone(MELBOURNE));
    expect(timeInTimezone(iso, MELBOURNE)).toBe('18:30');
  });
});

describe('formatAge', () => {
  // toISOString would give the UTC day, but formatAge reads a birthdate as
  // local midnight. Anywhere east of Greenwich the two disagree for part of
  // every day, and these helpers were then a day out -- passing or failing on
  // the clock rather than on the code.
  const asLocalDay = (date: Date): string =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');

  const daysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return asLocalDay(date);
  };

  const monthsAgo = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return asLocalDay(date);
  };

  it('returns null without a birthdate', () => {
    expect(formatAge(null, false)).toBeNull();
  });

  it('returns null for a birthdate in the future', () => {
    expect(formatAge(daysAgo(-5), false)).toBeNull();
  });

  it('calls the first day Newborn', () => {
    expect(formatAge(daysAgo(0), false)).toBe('Newborn');
  });

  it('counts days, then weeks, then months, then years', () => {
    expect(formatAge(daysAgo(3), false)).toBe('3 days');
    expect(formatAge(daysAgo(9), false)).toBe('1 week');
    expect(formatAge(daysAgo(21), false)).toBe('3 weeks');
    expect(formatAge(monthsAgo(5), false)).toBe('5 months');
    expect(formatAge(monthsAgo(30), false)).toBe('2 years');
  });

  it('uses the singular for a count of one', () => {
    expect(formatAge(daysAgo(1), false)).toBe('1 day');
    expect(formatAge(monthsAgo(1), false)).toBe('1 month');
    expect(formatAge(monthsAgo(12), false)).toBe('1 year');
  });

  it('prefixes About when the birthdate is only approximate', () => {
    expect(formatAge(daysAgo(3), true)).toBe('About 3 days');
    expect(formatAge(monthsAgo(30), true)).toBe('About 2 years');
  });
});

describe('formatAlertTime', () => {
  const zone = 'Australia/Brisbane';
  const now = new Date('2026-08-15T02:00:00.000Z'); // noon on the 15th in Brisbane

  it('keeps a duration under a day, in words', () => {
    expect(formatAlertTime('2026-08-15T01:59:30.000Z', zone, now)).toBe('Just now');
    expect(formatAlertTime('2026-08-15T01:30:00.000Z', zone, now)).toBe('30 minutes ago');
    expect(formatAlertTime('2026-08-14T21:00:00.000Z', zone, now)).toBe('5 hours ago');
  });

  it('says one, not 1s', () => {
    expect(formatAlertTime('2026-08-15T01:59:00.000Z', zone, now)).toBe('1 minute ago');
    expect(formatAlertTime('2026-08-15T01:00:00.000Z', zone, now)).toBe('1 hour ago');
    expect(formatAlertTime('2026-08-14T13:00:00.000Z', zone, now)).toBe('1 day ago');
  });

  // The bug this exists for. 26 hours back is two calendar days back in
  // Brisbane, but dividing elapsed hours by 24 gives 1, which read "Yesterday".
  it('counts calendar days, not elapsed hours', () => {
    expect(formatAlertTime('2026-08-13T00:00:00.000Z', zone, now)).toBe('2 days ago');
  });

  // The last day inside the inbox's window, and the first outside it.
  it('switches to a date at the edge of the window', () => {
    expect(formatAlertTime('2026-08-09T02:00:00.000Z', zone, now)).toBe('6 days ago');
    expect(formatAlertTime('2026-08-08T02:00:00.000Z', zone, now)).toBe('8 Aug');
  });

  it('counts calendar days once past midnight', () => {
    // 11pm on the 14th in Brisbane -- 13 hours old, but a day back.
    expect(formatAlertTime('2026-08-14T13:00:00.000Z', zone, now)).toBe('1 day ago');
  });

  it('falls back to a date beyond a week', () => {
    expect(formatAlertTime('2026-08-01T02:00:00.000Z', zone, now)).toBe('1 Aug');
    expect(formatAlertTime('2025-08-01T02:00:00.000Z', zone, now)).toBe('1 Aug 2025');
  });

  // The same instant is a day old in one zone and hours old in another, which
  // is the whole reason this takes the household's zone rather than the device's.
  it('reads the household timezone, not the device', () => {
    const instant = '2026-08-14T06:00:00.000Z';

    expect(formatAlertTime(instant, 'Australia/Brisbane', now)).toBe('1 day ago');
    expect(formatAlertTime(instant, 'America/New_York', now)).toBe('20 hours ago');
  });
});

describe('weekOf', () => {
  it('starts the week on Monday', () => {
    // 2026-08-31 is a Monday, so it leads its own week.
    expect(weekOf('2026-08-31')).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06'
    ]);
  });

  it('pulls a Sunday back to the week it ends, not the one it starts', () => {
    expect(weekOf('2026-09-06')[0]).toBe('2026-08-31');
    expect(weekOf('2026-09-06')[6]).toBe('2026-09-06');
  });

  it('crosses a month and a year boundary', () => {
    expect(weekOf('2026-01-01')[0]).toBe('2025-12-29');
    expect(weekOf('2026-01-01')[6]).toBe('2026-01-04');
  });
});

describe('week strip labels', () => {
  it('reads the initial and the date off the day', () => {
    expect(weekdayInitial('2026-08-31')).toBe('M');
    expect(weekdayInitial('2026-09-06')).toBe('S');
    expect(dayOfMonth('2026-09-02')).toBe(2);
  });

  it('formats the heading and the month line', () => {
    expect(formatWeekdayName('2026-08-31')).toBe('Monday');
    expect(formatMonthAndYear('2026-08-31')).toBe('AUG 2026');
  });
});
