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
 * Seconds Supabase wants you to wait, read off `over_email_send_rate_limit`.
 * The interval is a project setting, so it is only ever in the message.
 */
export const retryAfterSeconds = (error: unknown): number | undefined => {
  if (!(error instanceof AuthError) || error.code !== 'over_email_send_rate_limit') return;

  const seconds = Number(/after (\d+) seconds?/.exec(error.message)?.[1]);
  return Number.isFinite(seconds) ? seconds : undefined;
};

export const toUserFacingError = (error: AuthError) =>
  new UserFacingError(COPY[error.code ?? ''] ?? 'Something went wrong. Try again.');
