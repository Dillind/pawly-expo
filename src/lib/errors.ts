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
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'UserFacingError';
    this.cause = cause;
  }
}

export const logError = (error: unknown) =>
  console.error(error, error instanceof UserFacingError ? error.cause : undefined);

export const userFacingMessage = (error: unknown, fallback: string): string =>
  error instanceof UserFacingError ? error.message : fallback;
