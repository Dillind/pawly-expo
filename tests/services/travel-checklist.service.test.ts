import TravelChecklistService from '@/services/travel-checklist.service';

const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const mockRpc = jest.fn();

const result: { data: unknown; error: unknown } = { data: [], error: null };

const builder: Record<string, unknown> = {};

['select', 'eq', 'order', 'delete'].forEach((method) => {
  builder[method] = jest.fn(() => builder);
});

builder.single = jest.fn(() => Promise.resolve(result));
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
  supabase: {
    from: jest.fn(() => builder),
    rpc: (...args: unknown[]) => {
      mockRpc(...(args as []));
      return Promise.resolve(result);
    }
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  result.data = [];
  result.error = null;
});

const row = {
  id: 'c1',
  household_id: 'h1',
  name: 'Beach trip',
  emoji: '🏖️',
  travel_checklist_items: [
    { is_ticked: true, ticked_at: '2026-09-18T01:00:00Z' },
    { is_ticked: false, ticked_at: null },
    { is_ticked: true, ticked_at: '2026-09-18T02:00:00Z' }
  ]
};

describe('TravelChecklistService.list', () => {
  it('maps columns and counts ticks', async () => {
    result.data = [row];

    const [checklist] = await TravelChecklistService.list('h1');

    expect(checklist).toEqual({
      id: 'c1',
      householdId: 'h1',
      name: 'Beach trip',
      emoji: '🏖️',
      itemCount: 3,
      tickedCount: 2,
      packedAt: null
    });
  });

  it('dates a fully ticked list from its latest tick', async () => {
    result.data = [
      {
        ...row,
        travel_checklist_items: [
          { is_ticked: true, ticked_at: '2026-09-18T01:00:00Z' },
          { is_ticked: true, ticked_at: '2026-09-18T02:00:00Z' }
        ]
      }
    ];

    const [checklist] = await TravelChecklistService.list('h1');

    expect(checklist.packedAt).toBe('2026-09-18T02:00:00Z');
  });
});

describe('TravelChecklistService.get', () => {
  it('orders items by sort_order and maps every column', async () => {
    result.data = {
      ...row,
      travel_checklist_items: [
        {
          id: 'i2',
          checklist_id: 'c1',
          text: 'Bed',
          emoji: null,
          pet_id: null,
          sort_order: 2,
          created_at: '2026-09-18T00:00:02Z',
          is_ticked: false,
          ticked_by: null,
          ticked_at: null
        },
        {
          id: 'i1',
          checklist_id: 'c1',
          text: 'Insulin',
          emoji: '💉',
          pet_id: 'p1',
          sort_order: 1,
          created_at: '2026-09-18T00:00:01Z',
          is_ticked: true,
          ticked_by: 'u1',
          ticked_at: '2026-09-18T00:00:00Z'
        }
      ]
    };

    const detail = await TravelChecklistService.get('c1');

    expect(detail.items.map((item) => item.id)).toEqual(['i1', 'i2']);
    expect(detail.items[0]).toEqual({
      id: 'i1',
      checklistId: 'c1',
      text: 'Insulin',
      emoji: '💉',
      petId: 'p1',
      sortOrder: 1,
      createdAt: '2026-09-18T00:00:01Z',
      isTicked: true,
      tickedBy: 'u1',
      tickedAt: '2026-09-18T00:00:00Z'
    });
  });

  it('breaks a sort_order tie on created_at, then id', async () => {
    const item = (id: string, sort_order: number, created_at: string) => ({
      id,
      checklist_id: 'c1',
      text: id,
      emoji: null,
      pet_id: null,
      sort_order,
      created_at,
      is_ticked: false,
      ticked_by: null,
      ticked_at: null
    });
    result.data = {
      ...row,
      travel_checklist_items: [
        item('b', 3, '2026-09-18T00:00:05Z'),
        item('a', 3, '2026-09-18T00:00:05Z'),
        item('c', 3, '2026-09-18T00:00:04Z')
      ]
    };

    const detail = await TravelChecklistService.get('c1');

    expect(detail.items.map((entry) => entry.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('TravelChecklistService.create', () => {
  it('writes snake_case and trims the name', async () => {
    result.data = row;

    const outcome = await TravelChecklistService.create({
      householdId: 'h1',
      name: '  Beach trip ',
      emoji: '🏖️'
    });

    expect(mockInsert).toHaveBeenCalledWith({
      household_id: 'h1',
      name: 'Beach trip',
      emoji: '🏖️'
    });
    expect(outcome.status).toBe('created');
  });

  it('turns the cap trigger into a result, not a throw', async () => {
    result.error = { message: 'checklist_cap_reached' };

    await expect(
      TravelChecklistService.create({ householdId: 'h1', name: 'Second', emoji: null })
    ).resolves.toEqual({ status: 'cap_reached' });
  });
});

describe('TravelChecklistService.updateItem', () => {
  it('maps petId to pet_id and leaves absent fields alone', async () => {
    await TravelChecklistService.updateItem({ itemId: 'i1', petId: 'p2' });

    expect(mockUpdate).toHaveBeenCalledWith({ pet_id: 'p2' });
  });
});

describe('TravelChecklistService.tick', () => {
  it('writes only is_ticked', async () => {
    await TravelChecklistService.tick({ itemId: 'i1', isTicked: true });

    expect(mockUpdate).toHaveBeenCalledWith({ is_ticked: true });
  });
});

describe('TravelChecklistService.reset', () => {
  it('calls the RPC with the checklist id', async () => {
    await TravelChecklistService.reset('c1');

    expect(mockRpc).toHaveBeenCalledWith('reset_travel_checklist', { target_checklist_id: 'c1' });
  });
});
