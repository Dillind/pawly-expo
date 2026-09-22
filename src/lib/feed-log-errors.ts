type SupabaseLikeError = {
  message?: string;
  code?: string;
};

const GENERIC = 'Something went wrong. Try again.';

// Two failures share SQLSTATE 42501 and must not share copy: a policy refusal is the 24-hour
// backdating floor, a user error worth naming; a column-grant refusal is a client bug.
export function feedLogErrorMessage(error: unknown): string {
  const { message = '', code = '' } = (error ?? {}) as SupabaseLikeError;

  if (message.includes('row-level security')) return 'That time is more than 24 hours ago';
  if (code === '42501') return GENERIC;

  if (message.includes('Network request failed') || message.includes('Failed to fetch')) {
    return "Couldn't log the feed. Check your connection.";
  }

  return GENERIC;
}
