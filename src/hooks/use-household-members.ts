import { useHousehold } from '@/hooks/use-household';
import { supabase } from '@/lib/supabase/client';
import type { HouseholdMember } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('household_members')
    .select('user_id, role')
    .eq('household_id', householdId);

  if (membershipsError) throw membershipsError;

  const userIds = (memberships as { user_id: string; role: HouseholdMember['role'] }[]).map(
    (membership) => membership.user_id
  );

  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    (profiles as { id: string; first_name: string | null; last_name: string | null }[]).map(
      (profile) => [profile.id, profile]
    )
  );

  return (memberships as { user_id: string; role: HouseholdMember['role'] }[]).map(
    (membership) => ({
      userId: membership.user_id,
      role: membership.role,
      firstName: profileById.get(membership.user_id)?.first_name ?? null,
      lastName: profileById.get(membership.user_id)?.last_name ?? null
    })
  );
}

export function useHouseholdMembers() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['household-members', householdId],
    queryFn: () => fetchHouseholdMembers(householdId as string),
    enabled: Boolean(householdId)
  });
}

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

export function memberDisplayName(
  members: HouseholdMember[],
  userId: string | null | undefined
): string {
  if (!userId) return 'Removed member';

  return formatAuthorName(members.find((candidate) => candidate.userId === userId));
}
