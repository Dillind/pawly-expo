import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { AlertKind } from './subjects.ts';

/**
 * The delivery rule (ADR 0012): a Feed Logged Alert goes to every member of
 * the household EXCEPT the author, unless that member has turned Feed Logged
 * Alerts off.
 *
 * A Missed Feed Alert goes to every member with Missed Feed Alerts on, with
 * nobody excluded -- there is no actor, because the point is that no one acted.
 *
 * Role does not appear in the rule. Role-based routing was rejected because
 * ADR 0001 allows multiple Owners and the realistic v1 household is a couple
 * who are both Owners, so it would notify nobody. It is also the wrong axis:
 * the midday dog walker is precisely the person who most needs to know the dog
 * was already fed at 7am.
 *
 * A Post Alert follows the feed_logged shape: everyone except the author, minus
 * anyone with Post Alerts off. The author is excluded for the obvious reason --
 * they are holding the phone they just posted from.
 *
 * A Post Commented Alert is the first kind that names its recipient: "the
 * people in this conversation" cannot be worked out again later, so the trigger
 * writes one row per recipient and this narrows to that person. The preference
 * is still read here.
 *
 * Resolution happens HERE, at send time, rather than being fanned out when the
 * alert was queued -- so a preference changed between queue and delivery is
 * respected.
 */
const PREFERENCE_COLUMN: Record<AlertKind, string> = {
  feed_logged: 'feed_logged_alerts',
  missed_feed: 'missed_feed_alerts',
  post: 'post_alerts',
  // Comments ride the Post Alerts toggle rather than adding a fourth one.
  post_commented: 'post_alerts'
};

export const resolveRecipientTokens = async (
  client: SupabaseClient,
  alert: {
    household_id: string;
    kind: AlertKind;
    actor_id: string | null;
    recipient_id: string | null;
  }
): Promise<string[]> => {
  const preferenceColumn = PREFERENCE_COLUMN[alert.kind];

  let query = client
    .from('household_members')
    .select('user_id')
    .eq('household_id', alert.household_id)
    .eq(preferenceColumn, true);

  // A null recipient is household news; a set one addresses a single member.
  if (alert.recipient_id) {
    query = query.eq('user_id', alert.recipient_id);
  }

  // actor_id is null for missed_feed alerts, where nobody is excluded.
  if (alert.actor_id) {
    query = query.neq('user_id', alert.actor_id);
  }

  const { data: members, error: membersError } = await query;
  if (membersError) throw membersError;
  if (!members || members.length === 0) return [];

  const { data: tokens, error: tokensError } = await client
    .from('push_tokens')
    .select('token')
    .in(
      'user_id',
      members.map((member: { user_id: string }) => member.user_id)
    );

  if (tokensError) throw tokensError;

  return (tokens ?? []).map((row: { token: string }) => row.token);
};
