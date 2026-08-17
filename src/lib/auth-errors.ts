import { UserFacingError } from '@/lib/errors';
import { AuthError } from '@supabase/supabase-js';

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

const authErrorFrom = (error: unknown): AuthError | undefined => {
  if (error instanceof AuthError) return error;
  if (error instanceof UserFacingError && error.cause instanceof AuthError) return error.cause;
};

export const retryAfterSeconds = (error: unknown): number | undefined => {
  const authError = authErrorFrom(error);
  if (authError?.code !== 'over_email_send_rate_limit') return;

  const seconds = Number(/after (\d+) seconds?/.exec(authError.message)?.[1]);
  return Number.isFinite(seconds) ? seconds : undefined;
};

export const toUserFacingError = (error: AuthError) =>
  new UserFacingError(COPY[error.code ?? ''] ?? 'Something went wrong. Try again.', error);
