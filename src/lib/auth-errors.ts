import { UserFacingError } from '@/lib/errors';
import { AuthError } from '@supabase/supabase-js';

/**
 * Supabase writes its auth errors for developers -- "Token has expired or is
 * invalid", "Invalid login credentials". Match on `code` rather than the
 * message, which is prose the platform is free to reword.
 */
const COPY: Record<string, string> = {
  otp_expired: 'That code has expired. Send a new one.',
  invalid_credentials: 'That email and password do not match.',
  email_not_confirmed: 'Verify your email address first.',
  user_already_exists: 'That email already has an account.',
  same_password: 'That is your current password. Choose a different one.',
  weak_password: 'Choose a longer, less obvious password.',
  over_email_send_rate_limit: 'Too many emails. Wait a minute and try again.',
  validation_failed: 'Check the details and try again.'
};

/**
 * The Supabase error inside whatever a service threw. A caller downstream of
 * `toUserFacingError` only ever sees the wrapper, so anything wanting the
 * original has to unwrap it.
 */
const authErrorFrom = (error: unknown): AuthError | undefined => {
  if (error instanceof AuthError) return error;
  if (error instanceof UserFacingError && error.cause instanceof AuthError) return error.cause;
};

/**
 * Seconds Supabase wants you to wait, read off `over_email_send_rate_limit`.
 * The interval is a project setting, so it is only ever in the message.
 */
export const retryAfterSeconds = (error: unknown): number | undefined => {
  const authError = authErrorFrom(error);
  if (authError?.code !== 'over_email_send_rate_limit') return;

  const seconds = Number(/after (\d+) seconds?/.exec(authError.message)?.[1]);
  return Number.isFinite(seconds) ? seconds : undefined;
};

export const toUserFacingError = (error: AuthError) =>
  new UserFacingError(COPY[error.code ?? ''] ?? 'Something went wrong. Try again.', error);
