import { ROLE_OPTIONS } from '@/constants/options';
import type { HouseholdMember, HouseholdRole } from '@/types/core';
import { optionLabel } from '@/utils/options';

/**
 * `logged_by` is nullable with `on delete set null`, so a log can outlive its
 * author. That is deliberate -- a cascade would erase a household's whole
 * feeding history the day a Contributor deletes their account.
 *
 * Both entry points below resolve to a first name. A household is a handful of
 * trusted people, so "Dylan fed Bailey" is how a member would say it, and the
 * compact occurrence row has no space for more. Every surface must agree: the
 * same feed log is rendered by the Home occurrence row, the Activity row and the log
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

/** "Owner" / "Contributor", from the one list that defines them. */
export function roleLabel(role: HouseholdRole): string {
  return optionLabel(ROLE_OPTIONS, role) ?? 'Member';
}

/** The same, as prose: "an owner" / "a contributor". */
export function roleWithArticle(role: HouseholdRole): string {
  return `${role === 'owner' ? 'an' : 'a'} ${roleLabel(role).toLowerCase()}`;
}
