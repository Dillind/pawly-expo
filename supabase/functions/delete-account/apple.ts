export const APPLE_AUDIENCE = 'https://appleid.apple.com';
const CLIENT_SECRET_LIFETIME_SECONDS = 300;

export function clientSecretClaims(params: { teamId: string; bundleId: string; now: number }) {
  const issuedAt = Math.floor(params.now / 1000);
  return {
    iss: params.teamId,
    iat: issuedAt,
    exp: issuedAt + CLIENT_SECRET_LIFETIME_SECONDS,
    aud: APPLE_AUDIENCE,
    sub: params.bundleId
  };
}

export function jwtSubject(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof decoded?.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}
