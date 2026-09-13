import { ROLE_OPTIONS } from '@/constants/options';
import type { HouseholdMember, HouseholdRole } from '@/types/core';
import { optionLabel } from '@/utils/options';

// A log outlives its author, so every surface that names a person must agree or
// one feed log gets two names. The push copy keeps its own copy of this rule in
// supabase/functions/send-alerts/message.ts.
export function formatAuthorName(
  author: { firstName: string | null; lastName: string | null } | null | undefined
): string {
  if (!author) return 'Removed member';

  return author.firstName ?? 'Someone';
}

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

export function roleLabel(role: HouseholdRole): string {
  return optionLabel(ROLE_OPTIONS, role) ?? 'Member';
}

export function roleWithArticle(role: HouseholdRole): string {
  return `${role === 'owner' ? 'an' : 'a'} ${roleLabel(role).toLowerCase()}`;
}
