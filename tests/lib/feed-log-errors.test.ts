import { feedLogErrorMessage } from '@/lib/feed-log-errors';

describe('feedLogErrorMessage', () => {
  it('names the 24-hour floor when a policy refuses the write', () => {
    expect(
      feedLogErrorMessage({ code: '42501', message: 'new row violates row-level security policy' })
    ).toBe('That time is more than 24 hours ago');
  });

  it('stays generic when a column grant refuses the write', () => {
    expect(feedLogErrorMessage({ code: '42501', message: 'permission denied for table' })).toBe(
      'Something went wrong. Try again.'
    );
  });

  it('points at the connection when the request never arrived', () => {
    expect(feedLogErrorMessage(new TypeError('Network request failed'))).toBe(
      "Couldn't log the feed. Check your connection."
    );
  });

  it('never shows a raw database message', () => {
    expect(feedLogErrorMessage({ message: 'duplicate key value violates unique constraint' })).toBe(
      'Something went wrong. Try again.'
    );
  });
});
