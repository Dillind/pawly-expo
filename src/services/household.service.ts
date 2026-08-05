import { supabase } from '@/lib/supabase/client';
import type { Household, HouseholdMember } from '@/types/core';

export type NotificationPreferences = { feedLoggedAlerts: boolean };

type MembershipRow = {
  user_id: string;
  role: HouseholdMember['role'];
  feed_logged_alerts: boolean;
};

namespace HouseholdService {
  /**
   * Two round trips rather than a PostgREST embed: household_members.user_id
   * points at auth.users, so the embed graph here is not the obvious one, and
   * two explicit selects cannot be misread.
   *
   * v1 assumes one household per user, hence `.limit(1)` rather than a list.
   */
  export async function getForUser(userId: string): Promise<Household> {
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

  export async function existsForUser(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('household_members')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) throw error;

    return data.length > 0;
  }

  export async function listMembers(householdId: string): Promise<HouseholdMember[]> {
    const { data: memberships, error: membershipsError } = await supabase
      .from('household_members')
      .select('user_id, role, feed_logged_alerts')
      .eq('household_id', householdId);

    if (membershipsError) throw membershipsError;

    const userIds = (memberships as MembershipRow[]).map((membership) => membership.user_id);

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

    return (memberships as MembershipRow[]).map((membership) => ({
      userId: membership.user_id,
      role: membership.role,
      firstName: profileById.get(membership.user_id)?.first_name ?? null,
      lastName: profileById.get(membership.user_id)?.last_name ?? null,
      feedLoggedAlerts: membership.feed_logged_alerts
    }));
  }

  export async function getNotificationPreferences(
    householdId: string,
    userId: string
  ): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('household_members')
      .select('feed_logged_alerts')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return { feedLoggedAlerts: data.feed_logged_alerts };
  }

  export async function setFeedLoggedAlerts(params: {
    householdId: string;
    userId: string;
    value: boolean;
  }): Promise<void> {
    const { error } = await supabase
      .from('household_members')
      .update({ feed_logged_alerts: params.value })
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId);

    if (error) throw error;
  }
}

export default HouseholdService;
