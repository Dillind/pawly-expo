import { supabase } from '@/lib/supabase/client';
import type { HouseholdMember, HouseholdSummary } from '@/types/core';

export type NotificationPreferences = { feedLoggedAlerts: boolean; postAlerts: boolean };

/** The preferences a member can actually change. missed_feed_alerts is not one — see use-notification-preferences. */
export type AlertPreference = keyof NotificationPreferences;

type MembershipRow = {
  user_id: string;
  role: HouseholdMember['role'];
  feed_logged_alerts: boolean;
};

namespace HouseholdService {
  /**
   * Every household the user belongs to, oldest membership first, each with its
   * pets for the switcher.
   *
   * Separate selects rather than a PostgREST embed: household_members.user_id
   * points at auth.users, so the embed graph here is not the obvious one, and
   * explicit selects cannot be misread.
   *
   * This replaced a `.limit(1).single()` that had no `order by`. With two
   * memberships it returned an arbitrary household, and a member who joined a
   * second one watched her own pet disappear.
   */
  export async function listForUser(userId: string): Promise<HouseholdSummary[]> {
    const { data: memberships, error: membershipsError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (membershipsError) throw membershipsError;
    if (memberships.length === 0) return [];

    const householdIds = memberships.map((membership) => membership.household_id);

    const [{ data: households, error: householdsError }, { data: pets, error: petsError }] =
      await Promise.all([
        supabase
          .from('households')
          .select('id, name, timezone, grace_window_minutes')
          .in('id', householdIds),
        supabase
          .from('pets')
          .select('id, name, photo_url, household_id')
          .in('household_id', householdIds)
          .order('created_at', { ascending: true })
      ]);

    if (householdsError) throw householdsError;
    if (petsError) throw petsError;

    const householdById = new Map(households.map((household) => [household.id, household]));

    return memberships.flatMap((membership) => {
      const household = householdById.get(membership.household_id);

      if (!household) return [];

      return [
        {
          id: household.id,
          name: household.name,
          timezone: household.timezone,
          graceWindowMinutes: household.grace_window_minutes,
          role: membership.role,
          isOwner: membership.role === 'owner',
          pets: pets
            .filter((pet) => pet.household_id === household.id)
            .map((pet) => ({ id: pet.id, name: pet.name, photoUrl: pet.photo_url }))
        }
      ];
    });
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
      .select('feed_logged_alerts, post_alerts')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return { feedLoggedAlerts: data.feed_logged_alerts, postAlerts: data.post_alerts };
  }

  // household_members takes COLUMN-level update grants, so a new preference
  // column is invisible to writes until it is named in a `grant update (col)`.
  // The failure is silent: the write reports success and the value reverts on
  // the next refetch.
  const PREFERENCE_COLUMN: Record<AlertPreference, string> = {
    feedLoggedAlerts: 'feed_logged_alerts',
    postAlerts: 'post_alerts'
  };

  export async function setAlertPreference(params: {
    householdId: string;
    userId: string;
    preference: AlertPreference;
    value: boolean;
  }): Promise<void> {
    const { error } = await supabase
      .from('household_members')
      .update({ [PREFERENCE_COLUMN[params.preference]]: params.value })
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId);

    if (error) throw error;
  }
}

export default HouseholdService;
