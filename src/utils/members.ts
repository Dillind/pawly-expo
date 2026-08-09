import type { HouseholdMember } from '@/types/core';

/**
 * `logged_by` is nullable with `on delete set null`, so a log can outlive its
 * author. That is deliberate -- a cascade would erase a household's whole
 * feeding history the day a Contributor deletes their account.
 *
 * Both entry points below resolve to a first name. A household is a handful of
 * trusted people, so "Dylan fed Bailey" is how a member would say it, and the
 * compact slot row has no space for more. Every surface must agree: the same
 * feed log is rendered by the Home slot row, the Activity row and the log
 * sheet, and showing three different names for one person reads as a bug.
 */
export function formatAuthorName(
  author: { firstName: string | null; lastName: string | null } | null | undefined
): string {
  if (!author) return 'Removed member';

  return author.firstName ?? 'Member';
}

/** Both names where there is room for both, e.g. the Profile header and Members list. */
export function fullName(
  person: { firstName: string | null; lastName: string | null } | null | undefined
): string {
  if (!person) return '';

  return [person.firstName, person.lastName].filter(Boolean).join(' ');
}

export function memberDisplayName(
  members: HouseholdMember[],
  userId: string | null | undefined
): string {
  if (!userId) return 'Removed member';

  return formatAuthorName(members.find((candidate) => candidate.userId === userId));
}
