import { DELETE_ACCOUNT_PHRASE } from '@/constants/schemas/delete-account';

import {
  bearerToken,
  CONFIRMATION_PHRASE,
  isConfirmed
} from '../../../supabase/functions/delete-account/confirmation';

describe('isConfirmed', () => {
  it('matches the phrase the app asks for', () => {
    expect(CONFIRMATION_PHRASE).toBe(DELETE_ACCOUNT_PHRASE);
  });

  it('accepts the phrase with surrounding whitespace', () => {
    expect(isConfirmed('  delete my account ')).toBe(true);
  });

  it('does not fold case', () => {
    expect(isConfirmed('Delete my account')).toBe(false);
  });

  it('rejects anything that is not a string', () => {
    expect(isConfirmed(undefined)).toBe(false);
    expect(isConfirmed(null)).toBe(false);
    expect(isConfirmed(42)).toBe(false);
  });
});

describe('bearerToken', () => {
  it('reads the token from the header', () => {
    expect(bearerToken('Bearer abc.def')).toBe('abc.def');
  });

  it('returns null without a bearer header', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('Basic abc')).toBeNull();
  });
});
