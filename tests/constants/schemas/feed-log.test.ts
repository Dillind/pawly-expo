import { newFeedLogSchema } from '@/constants/schemas/feed-log';

// A fixed instant, so the suite passes under TZ=UTC, America/New_York and
// Pacific/Kiritimati alike. 2026-08-20 12:00 UTC is 22:00 in Melbourne.
const NOW = new Date('2026-08-20T12:00:00.000Z');

describe('newFeedLogSchema', () => {
  const schema = newFeedLogSchema({ timezone: 'Australia/Melbourne' });

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('accepts a time earlier today in the household timezone', () => {
    expect(schema.safeParse({ time: '18:00', notes: '' }).success).toBe(true);
  });

  it('rejects a time later today, because RLS refuses a future logged_at', () => {
    const result = schema.safeParse({ time: '23:30', notes: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("That time hasn't happened yet");
    expect(result.error?.issues[0]?.path).toEqual(['time']);
  });

  it('rejects a malformed time', () => {
    const result = schema.safeParse({ time: '7:00', notes: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter a valid time, like 07:30');
  });

  it('caps notes at what the feed_logs check constraint allows', () => {
    expect(schema.safeParse({ time: '18:00', notes: 'a'.repeat(280) }).success).toBe(true);
    expect(schema.safeParse({ time: '18:00', notes: 'a'.repeat(281) }).success).toBe(false);
  });
});
