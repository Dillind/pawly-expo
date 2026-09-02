import {
  dayPartForHour,
  dayPartInTimezone,
  greetingForHour,
  greetingInTimezone
} from '@/utils/day-part';

describe('dayPartForHour', () => {
  it('walks the four bands in order', () => {
    expect(dayPartForHour(5)).toBe('dawn');
    expect(dayPartForHour(7)).toBe('dawn');
    expect(dayPartForHour(8)).toBe('day');
    expect(dayPartForHour(16)).toBe('day');
    expect(dayPartForHour(17)).toBe('dusk');
    expect(dayPartForHour(18)).toBe('dusk');
    expect(dayPartForHour(19)).toBe('night');
  });

  it('keeps the small hours on night rather than a stale dusk', () => {
    expect(dayPartForHour(0)).toBe('night');
    expect(dayPartForHour(2)).toBe('night');
    expect(dayPartForHour(4)).toBe('night');
  });
});

describe('greetingForHour', () => {
  it('splits at noon and 5pm', () => {
    expect(greetingForHour(0)).toBe('Good morning');
    expect(greetingForHour(11)).toBe('Good morning');
    expect(greetingForHour(12)).toBe('Good afternoon');
    expect(greetingForHour(16)).toBe('Good afternoon');
    expect(greetingForHour(17)).toBe('Good evening');
    expect(greetingForHour(23)).toBe('Good evening');
  });
});

describe('in the household timezone, not the device one', () => {
  // 2026-08-31T22:30Z is the next morning in Melbourne and the same evening
  // in New York. The banner must follow the household, so the two disagree.
  const instant = new Date('2026-08-31T22:30:00.000Z');

  it('reads the same instant differently per zone', () => {
    expect(dayPartInTimezone('Australia/Melbourne', instant)).toBe('day');
    expect(dayPartInTimezone('America/New_York', instant)).toBe('dusk');

    expect(greetingInTimezone('Australia/Melbourne', instant)).toBe('Good morning');
    expect(greetingInTimezone('America/New_York', instant)).toBe('Good evening');
  });
});
