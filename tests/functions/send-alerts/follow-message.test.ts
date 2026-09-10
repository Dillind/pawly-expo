import { buildFollowRequestedMessage } from '../../../supabase/functions/send-alerts/message';

// The only alert the follow feature adds, and it runs towards the household. A
// follower is never told anything, not even that they were accepted.

describe('buildFollowRequestedMessage', () => {
  it('names the requester by their first name', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: 'Jess',
      householdId: 'household-1'
    });

    expect(message.body).toBe('Jess asked to follow your household');
  });

  it('says Someone when the account has no first name', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: null,
      householdId: 'household-1'
    });

    expect(message.body).toBe('Someone asked to follow your household');
  });

  it('sets no title, so iOS draws the app name alone on the top line', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: 'Jess',
      householdId: 'household-1'
    });

    expect(message.title).toBeUndefined();
  });

  it('deep links to the Requests screen of the household that was asked', () => {
    const message = buildFollowRequestedMessage({
      requesterFirstName: 'Jess',
      householdId: 'household-1'
    });

    expect(message.data).toEqual({
      screen: '/profile/household/[householdId]/followers/requests',
      params: { householdId: 'household-1' }
    });
  });
});
