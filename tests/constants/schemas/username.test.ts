import { RESERVED_USERNAMES, usernameSchema } from '@/constants/schemas/username';

const parse = (username: string) => usernameSchema.safeParse({ username });
const messageFor = (username: string) => parse(username).error?.issues[0]?.message;

describe('usernameSchema', () => {
  it('accepts a plain handle', () => {
    expect(parse('crumpet_lover').success).toBe(true);
    expect(parse('ben_dog_9').success).toBe(true);
  });

  it('lowercases what the Member typed, rather than rejecting it', () => {
    const result = parse('Ben_Dog');

    expect(result.success).toBe(true);
    expect(result.data?.username).toBe('ben_dog');
  });

  it('states the length rules separately', () => {
    expect(messageFor('ab')).toBe('Use at least 3 characters');
    expect(messageFor('a'.repeat(21))).toBe('Use 20 characters or fewer');
  });

  it('requires a letter first, so a handle never reads as a number', () => {
    expect(messageFor('9lives')).toBe('Start with a letter');
    expect(messageFor('_hidden')).toBe('Start with a letter');
  });

  it('names the characters it allows', () => {
    expect(messageFor('ben.dog')).toBe('Use letters, numbers and underscores only');
    expect(messageFor('ben dog')).toBe('Use letters, numbers and underscores only');
  });

  // Without this the word passes here, comes back unavailable from the RPC, and
  // the screen reports it as taken -- which is not why it was refused.
  it('refuses a reserved word as reserved, not as taken', () => {
    for (const reserved of RESERVED_USERNAMES) {
      expect(messageFor(reserved)).toBe('That username is reserved');
    }
  });

  // The check constraint holds the same five. If they drift, one of the two
  // reports the wrong reason.
  it('holds the same five words the check constraint does', () => {
    expect(RESERVED_USERNAMES).toEqual(['admin', 'crumpet', 'support', 'owner', 'help']);
  });
});
