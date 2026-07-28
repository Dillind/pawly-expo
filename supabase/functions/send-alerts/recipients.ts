import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/**
 * The delivery rule (ADR 0012): a Feed Logged Alert goes to every member of
 * the household EXCEPT the author, unless that member has turned Feed Logged
 * Alerts off.
 *
 * Role does not appear in the rule. Role-based routing was rejected because
 * ADR 0001 allows multiple Owners and the realistic v1 household is a couple
 * who are both Owners, so it would notify nobody. It is also the wrong axis:
 * the midday dog walker is precisely the person who most needs to know the dog
 * was already fed at 7am.
 *
 * Resolution happens HERE, at send time, rather than being fanned out when the
 * alert was queued -- so a preference changed between queue and delivery is
 * respected.
 */
export const resolveRecipientTokens = async (
  client: SupabaseClient,
  alert: { household_id: string; actor_id: string | null }
): Promise<string[]> => {
  let query = client
    .from('household_members')
    .select('user_id')
    .eq('household_id', alert.household_id)
    .eq('feed_logged_alerts', true);

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
