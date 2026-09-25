import {
  isFreshFor,
  providerSubject,
  reauthProvider
} from '../../../supabase/functions/delete-account/identity';

const NOW = 1_790_208_000;

describe('providerSubject', () => {
  it('reads the provider user id from the identity data', () => {
    expect(
      providerSubject(
        [
          { provider: 'email', id: 'x' },
          { provider: 'apple', id: 'fallback', identity_data: { sub: '001.apple' } }
        ],
        'apple'
      )
    ).toBe('001.apple');
  });

  it('falls back to the identity id', () => {
    expect(providerSubject([{ provider: 'google', id: 'g-1' }], 'google')).toBe('g-1');
  });

  it('is null when the user has no such identity', () => {
    expect(providerSubject([{ provider: 'email', id: 'x' }], 'apple')).toBeNull();
    expect(providerSubject(undefined, 'google')).toBeNull();
  });
});

describe('reauthProvider', () => {
  it('asks Apple first, then Google, then the password', () => {
    expect(
      reauthProvider([
        { provider: 'google', id: 'g' },
        { provider: 'apple', id: 'a' }
      ])
    ).toBe('apple');
    expect(
      reauthProvider([
        { provider: 'email', id: 'e' },
        { provider: 'google', id: 'g' }
      ])
    ).toBe('google');
    expect(reauthProvider([{ provider: 'email', id: 'e' }])).toBe('email');
  });
});

describe('isFreshFor', () => {
  it('accepts a token for this user issued in the last ten minutes', () => {
    expect(isFreshFor({ sub: 'u', iat: NOW - 30 }, 'u', NOW)).toBe(true);
  });

  it('refuses another user', () => {
    expect(isFreshFor({ sub: 'other', iat: NOW }, 'u', NOW)).toBe(false);
  });

  it('refuses an old token', () => {
    expect(isFreshFor({ sub: 'u', iat: NOW - 601 }, 'u', NOW)).toBe(false);
  });

  it('refuses a token with no issue time', () => {
    expect(isFreshFor({ sub: 'u' }, 'u', NOW)).toBe(false);
  });
});
