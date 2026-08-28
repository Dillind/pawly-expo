import { assertWrote } from '@/lib/supabase/assert-wrote';
import { supabase } from '@/lib/supabase/client';
import type { HouseholdMember, HouseholdSummary, LeadMinutes } from '@/types/core';

export type NotificationPreferences = {
  feedDueAlerts: boolean;
  missedFeedAlerts: boolean;
  feedLoggedAlerts: boolean;
  postAlerts: boolean;
  feedDueLeadMinutes: LeadMinutes;
};

/** The switches. feedDueLeadMinutes is a value, not a switch, so it is excluded. */
export type AlertPreference = Exclude<keyof NotificationPreferences, 'feedDueLeadMinutes'>;

/**
 * Every membership RPC answers with a jsonb status rather than throwing, the
 * way `log_feed` does — `last_owner` and `not_owner` are outcomes the UI has to
 * word differently, not failures.
 */
export type MembershipStatus =
  | 'changed'
  | 'unchanged'
  | 'removed'
  | 'left'
  | 'last_owner'
  | 'not_owner'
  | 'not_a_member'
  | 'use_leave';

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
   * points at auth.users, so the embed graph here is not the obvious one.
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

  export type HouseholdPatch = {
    name?: string;
    timezone?: string;
    graceWindowMinutes?: number;
  };

  // The service owns snake_case: a column name must never reach a component.
  export async function update(householdId: string, patch: HouseholdPatch): Promise<void> {
    const { data, error } = await supabase
      .from('households')
      .update({
        ...(patch.name !== undefined && { name: patch.name.trim() }),
        ...(patch.timezone !== undefined && { timezone: patch.timezone }),
        ...(patch.graceWindowMinutes !== undefined && {
          grace_window_minutes: patch.graceWindowMinutes
        })
      })
      .eq('id', householdId)
      .select('id');

    if (error) throw error;

    assertWrote(data, 'Only an owner can change household settings');
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
      .select('id, first_name, last_name, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profileById = new Map(
      (
        profiles as {
          id: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
        }[]
      ).map((profile) => [profile.id, profile])
    );

    return (memberships as MembershipRow[]).map((membership) => ({
      userId: membership.user_id,
      role: membership.role,
      firstName: profileById.get(membership.user_id)?.first_name ?? null,
      lastName: profileById.get(membership.user_id)?.last_name ?? null,
      avatarUrl: profileById.get(membership.user_id)?.avatar_url ?? null,
      feedLoggedAlerts: membership.feed_logged_alerts
    }));
  }

  const membershipStatus = (data: unknown): MembershipStatus =>
    (data as { status: MembershipStatus }).status;

  export async function setMemberRole(params: {
    householdId: string;
    userId: string;
    role: HouseholdMember['role'];
  }): Promise<MembershipStatus> {
    const { data, error } = await supabase.rpc('set_member_role', {
      target_household_id: params.householdId,
      target_user_id: params.userId,
      new_role: params.role
    });

    if (error) throw error;

    return membershipStatus(data);
  }

  export async function removeMember(params: {
    householdId: string;
    userId: string;
  }): Promise<MembershipStatus> {
    const { data, error } = await supabase.rpc('remove_household_member', {
      target_household_id: params.householdId,
      target_user_id: params.userId
    });

    if (error) throw error;

    return membershipStatus(data);
  }

  export async function leave(householdId: string): Promise<MembershipStatus> {
    const { data, error } = await supabase.rpc('leave_household', {
      target_household_id: householdId
    });

    if (error) throw error;

    return membershipStatus(data);
  }

  export async function getNotificationPreferences(
    householdId: string,
    userId: string
  ): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('household_members')
      .select(
        'feed_due_alerts, feed_due_lead_minutes, missed_feed_alerts, feed_logged_alerts, post_alerts'
      )
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return {
      feedDueAlerts: data.feed_due_alerts,
      feedDueLeadMinutes: data.feed_due_lead_minutes,
      missedFeedAlerts: data.missed_feed_alerts,
      feedLoggedAlerts: data.feed_logged_alerts,
      postAlerts: data.post_alerts
    };
  }

  // household_members takes COLUMN-level update grants, so a new preference
  // column is invisible to writes until it is named in a `grant update (col)`.
  // The failure is silent: the write reports success and the value reverts on
  // the next refetch.
  const PREFERENCE_COLUMN: Record<AlertPreference, string> = {
    feedDueAlerts: 'feed_due_alerts',
    missedFeedAlerts: 'missed_feed_alerts',
    feedLoggedAlerts: 'feed_logged_alerts',
    postAlerts: 'post_alerts'
  };

  export async function setAlertPreference(params: {
    householdId: string;
    userId: string;
    preference: AlertPreference;
    value: boolean;
  }): Promise<void> {
    const { data, error } = await supabase
      .from('household_members')
      .update({ [PREFERENCE_COLUMN[params.preference]]: params.value })
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId)
      .select('user_id');

    if (error) throw error;

    assertWrote(data, 'Your notification settings could not be updated');
  }

  export async function setFeedDueLeadMinutes(params: {
    householdId: string;
    userId: string;
    leadMinutes: LeadMinutes;
  }): Promise<void> {
    const { data, error } = await supabase
      .from('household_members')
      .update({ feed_due_lead_minutes: params.leadMinutes })
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId)
      .select('user_id');

    if (error) throw error;

    assertWrote(data, 'Your notification settings could not be updated');
  }
}

export default HouseholdService;
