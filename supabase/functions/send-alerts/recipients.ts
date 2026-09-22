import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { AlertKind } from './subjects.ts';

// The delivery rule is ADR 0012. Recipients resolve at send time, so a preference changed after
// the alert was queued still counts. Feed Due also filters on the member's lead time.
const PREFERENCE_COLUMN: Record<AlertKind, string | null> = {
  feed_logged: 'feed_logged_alerts',
  missed_feed: 'missed_feed_alerts',
  feed_due: 'feed_due_alerts',
  reminder_due: 'reminder_alerts',
  post: 'post_alerts',
  // Comments ride the Post Alerts toggle rather than adding a fourth one.
  post_commented: 'post_alerts',
  // No toggle, on purpose. A follow request is addressed to an Owner and asks
  // them to decide something only they can decide, so there is nothing to opt
  // out of without the request going unanswered.
  follow_requested: null,
  // Addressed to a Crumpet team member, who may belong to no household at all.
  feature_request_reported: null
};

export const resolveRecipientTokens = async (
  client: SupabaseClient,
  alert: {
    household_id: string | null;
    kind: AlertKind;
    actor_id: string | null;
    recipient_id: string | null;
    lead_minutes: number | null;
  }
): Promise<string[]> => {
  const preferenceColumn = PREFERENCE_COLUMN[alert.kind];

  if (alert.household_id === null) {
    if (!alert.recipient_id) return [];
    return tokensFor(client, [alert.recipient_id]);
  }

  let query = client
    .from('household_members')
    .select('user_id')
    .eq('household_id', alert.household_id);

  if (preferenceColumn) query = query.eq(preferenceColumn, true);

  // The cohort. A member who changed their lead time since the sweep has left
  // this one and hears nothing for this feed -- the same trade ADR 0012 makes
  // everywhere, because delivery resolves at send time.
  if (alert.kind === 'feed_due') {
    query = query.eq('feed_due_lead_minutes', alert.lead_minutes);
  }

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

  return tokensFor(
    client,
    members.map((member: { user_id: string }) => member.user_id)
  );
};

const tokensFor = async (client: SupabaseClient, userIds: string[]): Promise<string[]> => {
  const { data: tokens, error: tokensError } = await client
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);

  if (tokensError) throw tokensError;

  return (tokens ?? []).map((row: { token: string }) => row.token);
};
