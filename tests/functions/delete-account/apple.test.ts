import { clientSecretClaims, jwtSubject } from '../../../supabase/functions/delete-account/apple';

const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64').replace(/=+$/, '');

describe('clientSecretClaims', () => {
  it('builds the claims Apple asks for, valid for five minutes', () => {
    const claims = clientSecretClaims({
      teamId: 'TEAM123456',
      bundleId: 'au.com.crumpet.ios',
      now: Date.UTC(2026, 8, 24, 0, 0, 0)
    });

    expect(claims).toEqual({
      iss: 'TEAM123456',
      iat: 1790208000,
      exp: 1790208300,
      aud: 'https://appleid.apple.com',
      sub: 'au.com.crumpet.ios'
    });
  });
});

describe('jwtSubject', () => {
  it('reads sub from the payload', () => {
    expect(jwtSubject(`${encode({ alg: 'none' })}.${encode({ sub: '001.apple' })}.sig`)).toBe(
      '001.apple'
    );
  });

  it('is null for a token it cannot read', () => {
    expect(jwtSubject('not-a-jwt')).toBeNull();
    expect(jwtSubject('a.%%%.c')).toBeNull();
    expect(jwtSubject(`${encode({})}.${encode({ sub: 42 })}.sig`)).toBeNull();
  });
});
