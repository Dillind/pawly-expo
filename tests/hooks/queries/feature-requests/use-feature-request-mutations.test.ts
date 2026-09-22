import {
  applyToEveryList,
  toggleVote
} from '@/hooks/queries/feature-requests/use-feature-request-mutations';
import { dedupeRequests } from '@/hooks/queries/feature-requests/use-feature-requests';
import type { FeatureRequest } from '@/services/feature-request.service';

jest.mock('@/lib/supabase/client', () => ({ supabase: {} }));
jest.mock('@/lib/toast', () => ({ showErrorToast: jest.fn(), showSuccessToast: jest.fn() }));

const request = (id: string, voteCount: number, hasVoted = false): FeatureRequest => ({
  id,
  title: id,
  description: null,
  status: 'open',
  voteCount,
  hasVoted,
  isMine: false,
  isTeamPost: false,
  isHidden: false,
  reportCount: 0,
  createdAt: '2026-09-12T00:00:00Z'
});

describe('toggleVote', () => {
  it('adds a vote', () => {
    expect(toggleVote(request('a', 3))).toMatchObject({ voteCount: 4, hasVoted: true });
  });

  it('removes a vote', () => {
    expect(toggleVote(request('a', 3, true))).toMatchObject({ voteCount: 2, hasVoted: false });
  });
});

describe('applyToEveryList', () => {
  it('changes the count but never the order', () => {
    const data = {
      pages: [{ requests: [request('a', 5), request('b', 5)], nextCursor: null }],
      pageParams: [null]
    };

    const next = applyToEveryList(data, 'b', toggleVote);

    expect(next?.pages[0].requests.map((item) => [item.id, item.voteCount])).toEqual([
      ['a', 5],
      ['b', 6]
    ]);
  });
});

describe('dedupeRequests', () => {
  it('keeps the first copy of a request that moved across a page boundary', () => {
    const pages = [
      { requests: [request('a', 5), request('b', 4)] },
      { requests: [request('b', 5), request('c', 3)] }
    ];

    expect(dedupeRequests(pages).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});
