type SupabaseLikeError = {
  message?: string;
  code?: string;
};

/**
 * Turns a Postgres or network failure into the copy the user should see.
 * supabase-js rejects with a PostgrestError object, not an Error instance, so
 * this reads the shape rather than using `instanceof`.
 *
 * Two distinct failures both surface as SQLSTATE 42501 and must not share
 * copy: a policy refusal ("new row violates row-level security policy") is
 * the 24-hour backdating floor, the only bound a household member can trip on
 * feed_logs (Contributors only -- Owners are exempt) -- that is a user error
 * worth naming. A column-grant refusal ("permission denied for table
 * feed_logs") means the payload named a column the client has no grant for
 * (id, created_at, or pet_id/logged_by on an update) -- that is a client bug,
 * never something the user did wrong, so it must read as generic, not as a
 * rejection of their input.
 */
export function feedLogErrorMessage(error: unknown): string {
  const candidate = (error ?? {}) as SupabaseLikeError;
  const message = candidate.message ?? '';
  const code = candidate.code ?? '';

  if (code === '42501' || message.includes('row-level security')) {
    if (message.includes('row-level security')) {
      return 'That time is more than 24 hours ago';
    }

    // permission denied for table feed_logs -- a column grant said no, not a
    // policy. Never surface this as though the user did something wrong.
    return 'Something went wrong. Try again.';
  }

  if (message.includes('Network request failed') || message.includes('Failed to fetch')) {
    return "Couldn't log the feed. Check your connection.";
  }

  if (message.length > 0) return message;

  return 'Something went wrong. Try again.';
}
