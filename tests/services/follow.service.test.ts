import FollowService from '@/services/follow.service';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...(args as []))
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// The service owns snake_case. A column name must never reach a component, and
// every one of these rows arrives from Postgres in the database's spelling.

describe('preview', () => {
  it('maps the row spelling to the domain, photo_url included', async () => {
    mockRpc.mockResolvedValue({
      data: {
        status: 'none',
        household_id: 'household-1',
        name: "Kathy's Household",
        handle: 'kathys-house',
        pets: [{ id: 'pet-1', name: 'Rufus', breed: 'Kelpie', photo_url: 'https://x/1.jpg' }]
      },
      error: null
    });

    const preview = await FollowService.preview('household-1');

    expect(mockRpc).toHaveBeenCalledWith('follow_preview', {
      target_household_id: 'household-1'
    });
    expect(preview).toEqual({
      status: 'none',
      householdId: 'household-1',
      name: "Kathy's Household",
      handle: 'kathys-house',
      pets: [{ id: 'pet-1', name: 'Rufus', breed: 'Kelpie', photoUrl: 'https://x/1.jpg' }]
    });
  });

  it('returns null for a household that is not there', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'not_found' }, error: null });

    await expect(FollowService.preview('gone')).resolves.toBeNull();
  });

  it('reports a household with no handle as null rather than undefined', async () => {
    mockRpc.mockResolvedValue({
      data: { status: 'none', household_id: 'household-1', name: "Kathy's Household" },
      error: null
    });

    await expect(FollowService.preview('household-1')).resolves.toEqual({
      status: 'none',
      householdId: 'household-1',
      name: "Kathy's Household",
      handle: null,
      pets: []
    });
  });
});

describe('the write path', () => {
  it('asks to follow through the RPC, never a table insert', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'pending' }, error: null });

    await expect(FollowService.request('household-1')).resolves.toBe('pending');
    expect(mockRpc).toHaveBeenCalledWith('request_follow', {
      target_household_id: 'household-1',
      named_household_ids: []
    });
  });

  it('passes the accept flag through to respond_to_follow_request', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'declined' }, error: null });

    await expect(FollowService.respond({ followId: 'follow-1', accept: false })).resolves.toBe(
      'declined'
    );
    expect(mockRpc).toHaveBeenCalledWith('respond_to_follow_request', {
      follow_id: 'follow-1',
      accept: false
    });
  });

  it('removes a follower by the follow id, not by the person', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'removed' }, error: null });

    await expect(FollowService.remove('follow-1')).resolves.toBe('removed');
    expect(mockRpc).toHaveBeenCalledWith('remove_follower', { follow_id: 'follow-1' });
  });
});

describe('listFollowing', () => {
  it('maps household_id and pet_count into the domain', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { household_id: 'household-1', name: 'Kathy', pet_count: 3, status: 'accepted' },
        { household_id: 'household-2', name: 'Nguyen', pet_count: 0, status: 'pending' }
      ],
      error: null
    });

    await expect(FollowService.listFollowing()).resolves.toEqual([
      { householdId: 'household-1', name: 'Kathy', petCount: 3, status: 'accepted' },
      { householdId: 'household-2', name: 'Nguyen', petCount: 0, status: 'pending' }
    ]);
  });

  it('returns an empty list when the function answers with null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(FollowService.listFollowing()).resolves.toEqual([]);
  });
});

describe('listFollowers', () => {
  it('maps the row and its named Households, and keeps a missing account null', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'follow-1',
          follower_id: 'user-1',
          first_name: 'Dylan',
          last_name: 'Lindsay',
          avatar_url: null,
          requested_at: '2026-08-01T00:00:00Z',
          responded_at: '2026-08-02T00:00:00Z',
          named_households: [
            { household_id: 'h-2', name: 'The Smiths', handle: 'smiths', relationship: 'none' }
          ]
        },
        {
          id: 'follow-2',
          follower_id: 'user-2',
          first_name: null,
          last_name: null,
          avatar_url: null,
          requested_at: '2026-08-03T00:00:00Z',
          responded_at: null,
          named_households: []
        }
      ],
      error: null
    });

    const followers = await FollowService.listFollowers('household-1');

    expect(mockRpc).toHaveBeenCalledWith('list_household_follows', {
      target_household_id: 'household-1',
      follow_status: 'accepted'
    });
    expect(followers[0]).toEqual({
      id: 'follow-1',
      userId: 'user-1',
      firstName: 'Dylan',
      lastName: 'Lindsay',
      avatarUrl: null,
      requestedAt: '2026-08-01T00:00:00Z',
      respondedAt: '2026-08-02T00:00:00Z',
      namedHouseholds: [
        { householdId: 'h-2', name: 'The Smiths', handle: 'smiths', relationship: 'none' }
      ]
    });
    expect(followers[1].firstName).toBeNull();
  });
});

describe('listRequests', () => {
  it('asks for the pending rows', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await FollowService.listRequests('household-1');

    expect(mockRpc).toHaveBeenCalledWith('list_household_follows', {
      target_household_id: 'household-1',
      follow_status: 'pending'
    });
  });
});

describe('requestSummary', () => {
  it('maps the pinned row', async () => {
    mockRpc.mockResolvedValue({
      data: {
        pending_count: 2,
        newest: [{ first_name: 'Kara', last_name: null, avatar_url: null }],
        has_unread: true
      },
      error: null
    });

    await expect(FollowService.requestSummary('household-1')).resolves.toEqual({
      pendingCount: 2,
      newest: [{ firstName: 'Kara', lastName: null, avatarUrl: null }],
      hasUnread: true
    });
  });
});

describe('search', () => {
  it('maps the row spelling to the domain, relationship included', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          household_id: 'household-1',
          name: "Kathy's Household",
          handle: 'kathys-house',
          pet_count: 2,
          relationship: 'pending'
        }
      ],
      error: null
    });

    const results = await FollowService.search('kathy');

    expect(mockRpc).toHaveBeenCalledWith('search_households', { query: 'kathy' });
    expect(results).toEqual([
      {
        householdId: 'household-1',
        name: "Kathy's Household",
        handle: 'kathys-house',
        petCount: 2,
        relationship: 'pending'
      }
    ]);
  });

  it('returns an empty list when the function answers with nothing', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(FollowService.search('zzzz')).resolves.toEqual([]);
  });

  it('rethrows a failure rather than reporting no matches', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('network') });

    await expect(FollowService.search('kathy')).rejects.toThrow('network');
  });
});
