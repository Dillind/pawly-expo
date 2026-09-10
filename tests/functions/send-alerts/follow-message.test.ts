import { buildFollowRequestedMessage } from '../../../supabase/functions/send-alerts/message';

// The only alert the follow feature adds, and it runs towards the household. A
// follower is never told anything, not even that they were accepted.

describe('buildFollowRequestedMessage', () => {
  it('names the requester by handle, which every other surface also shows', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: 'Jess',
      requesterUsername: 'jesst',
      householdId: 'household-1'
    });

    expect(message.body).toBe('jesst asked to follow your household');
  });

  it('falls back to the first name, because a signup collision writes no handle', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: 'Jess',
      requesterUsername: null,
      householdId: 'household-1'
    });

    expect(message.body).toBe('Jess asked to follow your household');
  });

  it('falls back again when the account has neither', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: null,
      requesterUsername: null,
      householdId: 'household-1'
    });

    expect(message.body).toBe('A member asked to follow your household');
  });

  it('sets no title, so iOS draws the app name alone on the top line', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: 'Jess',
      requesterUsername: 'jesst',
      householdId: 'household-1'
    });

    expect(message.title).toBeUndefined();
  });

  it('deep links to the Requests screen of the household that was asked', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: 'Jess',
      requesterUsername: 'jesst',
      householdId: 'household-1'
    });

    expect(message.data).toEqual({
      screen: '/profile/household/[householdId]/followers/requests',
      params: { householdId: 'household-1' }
    });
  });
});
