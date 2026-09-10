import { ROLE_OPTIONS } from '@/constants/options';
import type { HouseholdMember, HouseholdRole } from '@/types/core';
import { optionLabel } from '@/utils/options';

/**
 * `logged_by` is nullable with `on delete set null`, so a log can outlive its
 * author. That is deliberate -- a cascade would erase a household's whole
 * feeding history the day a Contributor deletes their account.
 *
 * Every surface that names a person must agree, or the same feed log gets one
 * name on the lock screen and another when you tap it. The push copy keeps its
 * own copy of this rule in supabase/functions/send-alerts/message.ts.
 *
 * Not 'Member': a Follower writes comments and is never a Member.
 */
export function formatAuthorName(
  author: { firstName: string | null; lastName: string | null } | null | undefined
): string {
  if (!author) return 'Removed member';

  return author.firstName ?? 'Someone';
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
