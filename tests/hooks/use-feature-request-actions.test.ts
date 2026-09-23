import { featureRequestPermissions } from '@/hooks/use-feature-request-actions';
import type { FeatureRequest } from '@/services/feature-request.service';

jest.mock('@/hooks/queries/feature-requests/use-feature-request-mutations', () => ({}));

const request = (overrides: Partial<FeatureRequest> = {}): FeatureRequest => ({
  id: 'a',
  title: 'Dark mode',
  description: null,
  status: 'open',
  voteCount: 0,
  hasVoted: false,
  isMine: false,
  isTeamPost: false,
  isHidden: false,
  reportCount: 0,
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides
});

const member = { isTeam: false, isBanned: false };

describe('featureRequestPermissions', () => {
  it('lets a member report and hide someone else’s request, but not delete it', () => {
    expect(featureRequestPermissions(request(), member)).toMatchObject({
      canVote: true,
      canReport: true,
      canHideAuthor: true,
      canDeleteOwn: false,
      canModerate: false
    });
  });

  it('lets an author delete their own request, and never report or hide it', () => {
    expect(featureRequestPermissions(request({ isMine: true }), member)).toMatchObject({
      canReport: false,
      canHideAuthor: false,
      canDeleteOwn: true,
      canDeleteAsTeam: false
    });
  });

  it('stops a banned member voting or reporting', () => {
    const can = featureRequestPermissions(request(), { isTeam: false, isBanned: true });
    expect(can).toMatchObject({ canVote: false, canReport: false, canHideAuthor: true });
  });

  it('offers restore to the team only once a request has a report', () => {
    const team = { isTeam: true, isBanned: false };
    expect(featureRequestPermissions(request(), team).canRestore).toBe(false);
    expect(featureRequestPermissions(request({ reportCount: 1 }), team).canRestore).toBe(true);
  });
});
