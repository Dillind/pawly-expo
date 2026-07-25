import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import type { Household } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchHousehold(userId: string): Promise<Household> {
  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (membershipError) throw membershipError;

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, timezone, grace_window_minutes')
    .eq('id', membership.household_id)
    .single();

  if (householdError) throw householdError;

  return {
    id: household.id,
    timezone: household.timezone,
    graceWindowMinutes: household.grace_window_minutes,
    role: membership.role,
    isOwner: membership.role === 'owner'
  };
}

/**
 * The household the signed-in user belongs to. Two of its fields are read
 * constantly by the feed-logging feature: `timezone` (every day boundary and
 * slot calculation resolves in it, never in device-local time) and
 * `graceWindowMinutes` (the double-feed check).
 *
 * Two round trips rather than a PostgREST embed: household_members.user_id
 * points at auth.users, so the embed graph here is not the obvious one, and
 * two explicit selects cannot be misread.
 *
 * v1 assumes one household per user, hence `.limit(1)` rather than a list.
 */
export function useHousehold() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: ['household', userId],
    queryFn: () => fetchHousehold(userId as string),
    enabled: Boolean(userId)
  });
}
