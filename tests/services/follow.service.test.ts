import FollowService from '@/services/follow.service';

const mockRpc = jest.fn();
const mockOrder = jest.fn();
const mockEqStatus = jest.fn(() => ({ order: mockOrder }));
const mockEqHousehold = jest.fn(() => ({ eq: mockEqStatus }));
const mockSelect = jest.fn(() => ({ eq: mockEqHousehold }));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({ select: mockSelect })),
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
      target_household_id: 'household-1'
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
  it('flattens the embedded user and keeps a missing account null', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'follow-1',
          follower_id: 'user-1',
          requested_at: '2026-08-01T00:00:00Z',
          responded_at: '2026-08-02T00:00:00Z',
          users: {
            first_name: 'Dylan',
            last_name: 'Lindsay',
            avatar_url: null
          }
        },
        {
          id: 'follow-2',
          follower_id: 'user-2',
          requested_at: '2026-08-03T00:00:00Z',
          responded_at: null,
          users: null
        }
      ],
      error: null
    });

    const followers = await FollowService.listFollowers('household-1');

    expect(followers[0]).toEqual({
      id: 'follow-1',
      userId: 'user-1',
      firstName: 'Dylan',
      lastName: 'Lindsay',
      avatarUrl: null,
      requestedAt: '2026-08-01T00:00:00Z',
      respondedAt: '2026-08-02T00:00:00Z'
    });
    expect(followers[1].firstName).toBeNull();
    expect(mockEqStatus).toHaveBeenCalledWith('status', 'accepted');
  });
});

describe('listRequests', () => {
  it('asks for the pending rows, oldest first', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    await FollowService.listRequests('household-1');

    expect(mockEqStatus).toHaveBeenCalledWith('status', 'pending');
    expect(mockOrder).toHaveBeenCalledWith('requested_at', { ascending: true });
  });
});
