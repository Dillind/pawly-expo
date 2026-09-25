export const CONFIRMATION_PHRASE = 'delete my account';

// Trimmed but not case-folded, as for a Household name (ADR 0040).
export function isConfirmed(typed: unknown): boolean {
  return typeof typed === 'string' && typed.trim() === CONFIRMATION_PHRASE;
}

export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
