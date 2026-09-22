import FeatureRequestService, {
  FeatureRequestCreateError
} from '@/services/feature-request.service';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) }
}));

const row = (id: string, voteCount = 3) => ({
  id,
  title: 'Weight tracking',
  description: null,
  status: 'in_progress',
  vote_count: voteCount,
  has_voted: true,
  is_mine: false,
  is_team_post: true,
  is_hidden: false,
  report_count: 0,
  created_at: '2026-09-12T00:00:00Z'
});

beforeEach(() => mockRpc.mockReset());

describe('FeatureRequestService.list', () => {
  it('maps snake_case rows to the domain shape', async () => {
    mockRpc.mockResolvedValue({ data: [row('a')], error: null });

    const page = await FeatureRequestService.list({
      sort: 'top',
      reportedOnly: false,
      cursor: null
    });

    expect(page.requests[0]).toEqual({
      id: 'a',
      title: 'Weight tracking',
      description: null,
      status: 'in_progress',
      voteCount: 3,
      hasVoted: true,
      isMine: false,
      isTeamPost: true,
      isHidden: false,
      reportCount: 0,
      createdAt: '2026-09-12T00:00:00Z'
    });
  });

  it('passes the cursor as the keyset columns', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await FeatureRequestService.list({
      sort: 'new',
      reportedOnly: true,
      cursor: { voteCount: 4, createdAt: '2026-09-01T00:00:00Z', id: 'z' }
    });

    expect(mockRpc).toHaveBeenCalledWith('list_feature_requests', {
      sort: 'new',
      reported_only: true,
      after_vote_count: 4,
      after_created_at: '2026-09-01T00:00:00Z',
      after_id: 'z',
      page_size: 20
    });
  });

  it('has no next page when the page is short', async () => {
    mockRpc.mockResolvedValue({ data: [row('a')], error: null });

    const page = await FeatureRequestService.list({
      sort: 'top',
      reportedOnly: false,
      cursor: null
    });

    expect(page.nextCursor).toBeNull();
  });

  it('builds the next cursor from the last row of a full page', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => row(`r${index}`, 20 - index));
    mockRpc.mockResolvedValue({ data: rows, error: null });

    const page = await FeatureRequestService.list({
      sort: 'top',
      reportedOnly: false,
      cursor: null
    });

    expect(page.nextCursor).toEqual({ voteCount: 1, createdAt: '2026-09-12T00:00:00Z', id: 'r19' });
  });
});

describe('FeatureRequestService.create', () => {
  it('turns the daily limit into a typed error the form can show', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'daily_limit_reached' } });

    await expect(
      FeatureRequestService.create({ title: 'Dark mode', description: null })
    ).rejects.toEqual(new FeatureRequestCreateError('daily_limit_reached'));
  });

  it('rethrows an error it does not know', async () => {
    const error = { message: 'network down' };
    mockRpc.mockResolvedValue({ data: null, error });

    await expect(
      FeatureRequestService.create({ title: 'Dark mode', description: null })
    ).rejects.toBe(error);
  });
});

describe('FeatureRequestService.get', () => {
  it('returns null for a removed request', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await expect(FeatureRequestService.get('gone')).resolves.toBeNull();
  });
});
