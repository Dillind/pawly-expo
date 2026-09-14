type SupabaseLikeError = {
  message?: string;
  code?: string;
};

// Two distinct failures share SQLSTATE 42501 and must not share copy: a policy
// refusal is the 24-hour backdating floor, which is a user error worth naming; a
// column-grant refusal is a client bug and must read as generic.
export function feedLogErrorMessage(error: unknown): string {
  const candidate = (error ?? {}) as SupabaseLikeError;
  const message = candidate.message ?? '';
  const code = candidate.code ?? '';

  if (code === '42501' || message.includes('row-level security')) {
    if (message.includes('row-level security')) {
      return 'That time is more than 24 hours ago';
    }

    // A column grant said no, not a policy. Never blame the user for this.
    return 'Something went wrong. Try again.';
  }

  if (message.includes('Network request failed') || message.includes('Failed to fetch')) {
    return "Couldn't log the feed. Check your connection.";
  }

  if (message.length > 0) return message;

  return 'Something went wrong. Try again.';
}
