import { retryAfterSeconds, toUserFacingError } from '@/lib/auth-errors';
import { UserFacingError } from '@/lib/errors';
import { AuthApiError } from '@supabase/supabase-js';

const rateLimited = (message: string) =>
  new AuthApiError(message, 429, 'over_email_send_rate_limit');

describe('toUserFacingError', () => {
  it('replaces Supabase copy with our own', () => {
    const error = toUserFacingError(
      new AuthApiError('Token has expired or is invalid', 403, 'otp_expired')
    );

    expect(error.message).toBe('That code has expired. Send a new one.');
  });

  it('keeps the original as the cause, so the real failure still reaches the log', () => {
    const original = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');

    expect(toUserFacingError(original).cause).toBe(original);
  });

  it('falls back for a code it does not know', () => {
    const error = toUserFacingError(new AuthApiError('boom', 500, 'something_new'));

    expect(error.message).toBe('Something went wrong. Try again.');
  });
});

describe('retryAfterSeconds', () => {
  it('reads the wait off a rate-limit error', () => {
    expect(
      retryAfterSeconds(
        rateLimited('For security purposes, you can only request this after 47 seconds.')
      )
    ).toBe(47);
  });

  // The regression this was written for: every caller is downstream of
  // toUserFacingError, so an unwrapped-only check never matched and the
  // server's own cooldown was silently ignored.
  it('reads it through a UserFacingError wrapper', () => {
    const wrapped = toUserFacingError(
      rateLimited('For security purposes, you can only request this after 47 seconds.')
    );

    expect(retryAfterSeconds(wrapped)).toBe(47);
  });

  it('returns undefined for anything else', () => {
    expect(retryAfterSeconds(new UserFacingError('nope'))).toBeUndefined();
    expect(retryAfterSeconds(new Error('nope'))).toBeUndefined();
  });
});
