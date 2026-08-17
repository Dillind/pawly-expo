/**
 * An error whose message was written for the person using the app, not for a
 * developer. Services throw this when they have translated a driver failure
 * into something actionable -- "There is already a dinner feed", not
 * "duplicate key value violates unique constraint".
 *
 * Anything else reaching a toast is a raw Supabase or Postgres string and must
 * be replaced with the call site's own copy.
 */
export class UserFacingError extends Error {
  /**
   * The failure this was translated from. The message is copy written for a
   * person, so without this the driver's own error -- the SQLSTATE, the auth
   * code, the network failure -- survives nowhere, and `console.error` in every
   * `onError` would only ever print our own sentence back at us.
   */
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'UserFacingError';
    this.cause = cause;
  }
}

/**
 * Log a failure with the driver's own error, not just our copy.
 *
 * `console.error(error)` prints an Error's stack, which for a UserFacingError
 * is the sentence we wrote -- the SQLSTATE or auth code that actually explains
 * the failure is on `cause` and never reaches the log without this.
 */
export const logError = (error: unknown) =>
  console.error(error, error instanceof UserFacingError ? error.cause : undefined);

export const userFacingMessage = (error: unknown, fallback: string): string =>
  error instanceof UserFacingError ? error.message : fallback;
