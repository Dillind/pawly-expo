import FeedLogService from '@/services/feed-log.service';

const result: { data: unknown; error: unknown } = { data: [], error: null };

const builder: Record<string, jest.Mock | unknown> = {};

['select', 'eq', 'is', 'gte', 'lt', 'order'].forEach((method) => {
  builder[method] = jest.fn(() => builder);
});

builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn(() => builder) }
}));

const row = (id: string, loggedAt: string) => ({
  id,
  pet_id: 'pet-1',
  logged_by: 'user-1',
  logged_at: loggedAt,
  notes: null,
  created_at: loggedAt,
  users: { first_name: 'Sam', last_name: null }
});

beforeEach(() => {
  jest.clearAllMocks();
  result.data = [];
  result.error = null;
});

describe('FeedLogService.getOffScheduleForDay', () => {
  it('asks only for logs with no scheduled occurrence', async () => {
    await FeedLogService.getOffScheduleForDay('pet-1', '2026-09-22', 'Australia/Melbourne');

    expect(builder.eq).toHaveBeenCalledWith('pet_id', 'pet-1');
    expect(builder.is).toHaveBeenCalledWith('feed_time_series_id', null);
  });

  it('keeps only logs that fall on the day in the household timezone', async () => {
    result.data = [
      row('before', '2026-09-21T13:30:00Z'),
      row('inside', '2026-09-21T14:30:00Z'),
      row('after', '2026-09-22T14:30:00Z')
    ];

    const logs = await FeedLogService.getOffScheduleForDay(
      'pet-1',
      '2026-09-22',
      'Australia/Melbourne'
    );

    expect(logs.map((log) => log.id)).toEqual(['inside']);
    expect(logs[0]).toMatchObject({
      petId: 'pet-1',
      loggedBy: 'user-1',
      loggedAt: '2026-09-21T14:30:00Z',
      author: { firstName: 'Sam', lastName: null }
    });
  });
});
