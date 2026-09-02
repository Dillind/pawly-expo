import OccasionService from '@/services/occasion.service';

const mockUpdate = jest.fn();
const mockInsert = jest.fn();

const result: { data: unknown; error: unknown } = { data: [], error: null };

const builder: Record<string, unknown> = {};

['select', 'eq', 'is', 'order', 'limit'].forEach((method) => {
  builder[method] = jest.fn(() => builder);
});

builder.single = jest.fn(() => Promise.resolve(result));
builder.maybeSingle = jest.fn(() => Promise.resolve({ data: null, error: null }));
builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);

builder.update = (...args: unknown[]) => {
  mockUpdate(...(args as []));
  return builder;
};

builder.insert = (...args: unknown[]) => {
  mockInsert(...(args as []));
  return builder;
};

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn(() => builder) }
}));

beforeEach(() => {
  jest.clearAllMocks();
  result.data = [];
  result.error = null;
});

describe('OccasionService.list', () => {
  it('maps column names back into the domain shape', async () => {
    result.data = [
      {
        id: 'occasion-1',
        household_id: 'house-1',
        emoji: '🎉',
        label: 'Milestone',
        sort_order: 0,
        deleted_at: null
      }
    ];

    await expect(OccasionService.list('house-1')).resolves.toEqual([
      {
        id: 'occasion-1',
        householdId: 'house-1',
        emoji: '🎉',
        label: 'Milestone',
        sortOrder: 0,
        deletedAt: null
      }
    ]);
  });
});

describe('OccasionService.create', () => {
  it('writes snake_case columns, so a column name never reaches a component', async () => {
    result.data = {
      id: 'occasion-2',
      household_id: 'house-1',
      emoji: '🐾',
      label: 'First swim',
      sort_order: 0,
      deleted_at: null
    };

    await OccasionService.create({ householdId: 'house-1', emoji: '🐾', label: 'First swim' });

    expect(mockInsert).toHaveBeenCalledWith({
      household_id: 'house-1',
      emoji: '🐾',
      label: 'First swim',
      sort_order: 0
    });
  });
});

describe('OccasionService.remove', () => {
  it('stamps deleted_at rather than deleting the row', async () => {
    await OccasionService.remove('occasion-1');

    const [patch] = mockUpdate.mock.calls[0] as [{ deleted_at: string }];

    expect(Object.keys(patch)).toEqual(['deleted_at']);
    expect(Date.parse(patch.deleted_at)).not.toBeNaN();
  });
});
