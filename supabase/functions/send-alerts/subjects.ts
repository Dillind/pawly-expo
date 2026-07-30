import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  buildFeedLoggedMessage,
  buildMissedFeedMessage,
  type ExpoMessage,
  type ScheduleLabel
} from './message.ts';

type AlertSubject = {
  kind: 'feed_logged' | 'missed_feed';
  subject_id: string;
};

/**
 * subject_id is a feed_logs.id for feed_logged and a feeding_schedules.id for
 * missed_feed. Null means the row is gone -- deleted between queue and dispatch.
 */
export const buildMessageForAlert = async (
  client: SupabaseClient,
  alert: AlertSubject
): Promise<Omit<ExpoMessage, 'to'> | null> => {
  if (alert.kind === 'feed_logged') {
    const { data: log } = await client
      .from('feed_logs')
      .select('id, logged_at, notes, logged_by, pets ( name, households ( timezone ) )')
      .eq('id', alert.subject_id)
      .maybeSingle();

    if (!log) return null;

    // logged_by is nullable with on delete set null -- a log can outlive its
    // author, and buildFeedLoggedMessage renders that as "Member".
    const { data: author } = log.logged_by
      ? await client.from('users').select('first_name').eq('id', log.logged_by).maybeSingle()
      : { data: null };

    // deno-lint-ignore no-explicit-any
    const pet = (log as any).pets;

    return buildFeedLoggedMessage({
      authorFirstName: author?.first_name ?? null,
      petName: pet.name,
      loggedAt: log.logged_at,
      householdTimezone: pet.households.timezone,
      notes: log.notes,
      logId: log.id
    });
  }

  const { data: slot } = await client
    .from('feeding_schedules')
    .select('scheduled_time, label, pets ( name )')
    .eq('id', alert.subject_id)
    .maybeSingle();

  if (!slot) return null;

  // deno-lint-ignore no-explicit-any
  const pet = (slot as any).pets;

  return buildMissedFeedMessage({
    petName: pet.name,
    label: slot.label as ScheduleLabel,
    scheduledTime: slot.scheduled_time
  });
};
