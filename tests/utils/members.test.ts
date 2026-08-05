import type { HouseholdMember } from '@/types/core';
import { formatAuthorName, memberDisplayName } from '@/utils/members';

const members: HouseholdMember[] = [
  { userId: 'u1', role: 'owner', firstName: 'Dylan', lastName: 'Lindsay', feedLoggedAlerts: true },
  { userId: 'u2', role: 'contributor', firstName: null, lastName: null, feedLoggedAlerts: false }
];

describe('formatAuthorName', () => {
  it('uses the first name', () => {
    expect(formatAuthorName({ firstName: 'Dylan', lastName: 'Lindsay' })).toBe('Dylan');
  });

  it('says Removed member when the author is gone', () => {
    // logged_by is `on delete set null`, so a log outlives its author.
    expect(formatAuthorName(null)).toBe('Removed member');
    expect(formatAuthorName(undefined)).toBe('Removed member');
  });

  it('falls back to Member when the profile has no first name', () => {
    expect(formatAuthorName({ firstName: null, lastName: 'Lindsay' })).toBe('Member');
  });
});

describe('memberDisplayName', () => {
  it('resolves a household member by id', () => {
    expect(memberDisplayName(members, 'u1')).toBe('Dylan');
    expect(memberDisplayName(members, 'u2')).toBe('Member');
  });

  it('says Removed member for a null id or an unknown id', () => {
    expect(memberDisplayName(members, null)).toBe('Removed member');
    expect(memberDisplayName(members, 'nobody')).toBe('Removed member');
  });
});
