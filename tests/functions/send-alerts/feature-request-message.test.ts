import { buildFeatureRequestReportedMessage } from '../../../supabase/functions/send-alerts/message';

describe('buildFeatureRequestReportedMessage', () => {
  it('never carries the title a user typed', () => {
    expect(buildFeatureRequestReportedMessage().body).toBe('A feature request was reported');
  });

  it('opens the board with the Reported filter on', () => {
    expect(buildFeatureRequestReportedMessage().data).toEqual({
      screen: '/profile/settings/feature-requests',
      params: { reported: '1' }
    });
  });
});
