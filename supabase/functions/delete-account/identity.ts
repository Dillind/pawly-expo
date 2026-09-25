export const APPLE_ISSUER = 'https://appleid.apple.com';
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
export const MAX_TOKEN_AGE_SECONDS = 600;

export type Provider = 'apple' | 'google' | 'email';

type Identity = { provider: string; id?: string; identity_data?: { sub?: unknown } | null };

export function providerSubject(
  identities: Identity[] | undefined,
  provider: 'apple' | 'google'
): string | null {
  const identity = identities?.find((candidate) => candidate.provider === provider);
  if (!identity) return null;
  const sub = identity.identity_data?.sub;
  return typeof sub === 'string' ? sub : (identity.id ?? null);
}

export function reauthProvider(identities: Identity[] | undefined): Provider {
  if (providerSubject(identities, 'apple')) return 'apple';
  if (providerSubject(identities, 'google')) return 'google';
  return 'email';
}

export function isFreshFor(
  claims: { sub?: unknown; iat?: unknown },
  subject: string,
  nowSeconds: number
): boolean {
  if (claims.sub !== subject || typeof claims.iat !== 'number') return false;
  const age = nowSeconds - claims.iat;
  return age >= -60 && age <= MAX_TOKEN_AGE_SECONDS;
}
