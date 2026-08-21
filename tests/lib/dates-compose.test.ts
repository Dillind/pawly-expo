import { composeLoggedAt } from '@/lib/dates';

/**
 * composeLoggedAt used dayjs.tz, which is broken under Hermes — it returned
 * instants roughly fourteen minutes off on device. These assert the instant
 * itself, so they fail for any offset error rather than only for a wrong zone.
 */
describe('composeLoggedAt', () => {
  const at = (iso: string) => {
    jest.useFakeTimers().setSystemTime(new Date(iso));
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves a wall-clock time in a zone with no DST', () => {
    // 2026-08-20 20:33Z is 2026-08-21 06:33 in Brisbane (UTC+10).
    at('2026-08-20T20:33:00.000Z');

    expect(composeLoggedAt('today', '06:33', 'Australia/Brisbane')).toBe(
      '2026-08-20T20:33:00.000Z'
    );
    expect(composeLoggedAt('today', '00:00', 'Australia/Brisbane')).toBe(
      '2026-08-20T14:00:00.000Z'
    );
    expect(composeLoggedAt('today', '23:59', 'Australia/Brisbane')).toBe(
      '2026-08-21T13:59:00.000Z'
    );
  });

  it('reads yesterday as the previous local day', () => {
    at('2026-08-20T20:33:00.000Z');

    expect(composeLoggedAt('yesterday', '06:33', 'Australia/Brisbane')).toBe(
      '2026-08-19T20:33:00.000Z'
    );
  });

  it('uses the offset in force on the day, not today’s', () => {
    // New York is UTC-4 in August (EDT).
    at('2026-08-20T16:00:00.000Z');

    expect(composeLoggedAt('today', '12:00', 'America/New_York')).toBe('2026-08-20T16:00:00.000Z');
  });

  it('resolves a winter date in a DST zone at the winter offset', () => {
    // 2026-01-15 12:00 in New York is EST (UTC-5), not EDT.
    at('2026-01-15T17:00:00.000Z');

    expect(composeLoggedAt('today', '12:00', 'America/New_York')).toBe('2026-01-15T17:00:00.000Z');
  });

  it('handles a UTC+14 zone', () => {
    // Kiritimati is UTC+14, so local 2026-08-21 06:33 is 2026-08-20 16:33Z.
    at('2026-08-20T16:33:00.000Z');

    expect(composeLoggedAt('today', '06:33', 'Pacific/Kiritimati')).toBe(
      '2026-08-20T16:33:00.000Z'
    );
  });
});
