import type { HouseholdMember } from '@/types/core';
import { formatAuthorName, memberDisplayName } from '@/utils/members';

const members: HouseholdMember[] = [
  {
    userId: 'u1',
    role: 'owner',
    firstName: 'Dylan',
    lastName: 'Lindsay',
    username: 'dylan',
    avatarUrl: null,
    feedLoggedAlerts: true
  },
  {
    userId: 'u2',
    role: 'contributor',
    firstName: null,
    lastName: null,
    username: null,
    avatarUrl: null,
    feedLoggedAlerts: false
  }
];

describe('formatAuthorName', () => {
  it('uses the handle, not the first name', () => {
    expect(
      formatAuthorName({ firstName: 'Dylan', lastName: 'Lindsay', username: 'dylan4k2p' })
    ).toBe('dylan4k2p');
  });

  it('falls back to the first name when a signup collision wrote no handle', () => {
    expect(formatAuthorName({ firstName: 'Dylan', lastName: 'Lindsay', username: null })).toBe(
      'Dylan'
    );
  });

  it('says Removed member when the author is gone', () => {
    // logged_by is `on delete set null`, so a log outlives its author.
    expect(formatAuthorName(null)).toBe('Removed member');
    expect(formatAuthorName(undefined)).toBe('Removed member');
  });

  it('falls back to Member when there is neither a handle nor a first name', () => {
    expect(formatAuthorName({ firstName: null, lastName: 'Lindsay', username: null })).toBe(
      'Member'
    );
  });
});

describe('memberDisplayName', () => {
  it('resolves a household member by id', () => {
    expect(memberDisplayName(members, 'u1')).toBe('dylan');
    expect(memberDisplayName(members, 'u2')).toBe('Member');
  });

  it('says Removed member for a null id or an unknown id', () => {
    expect(memberDisplayName(members, null)).toBe('Removed member');
    expect(memberDisplayName(members, 'nobody')).toBe('Removed member');
  });
});
