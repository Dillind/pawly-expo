import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  buildFeedLoggedMessage,
  buildMissedFeedMessage,
  buildPostMessage,
  type ExpoMessage,
  type ScheduleLabel
} from './message.ts';

export type AlertKind = 'feed_logged' | 'missed_feed' | 'post';

type AlertSubject = {
  kind: AlertKind;
  subject_id: string;
};

/**
 * subject_id is a feed_logs.id for feed_logged, a feeding_schedules.id for
 * missed_feed, and a posts.id for post. Null means the row is gone -- deleted
 * between queue and dispatch.
 *
 * Every kind gets its own branch and the last one is explicit rather than a
 * fallthrough. The `post` kind was added to alert_kind before this function
 * knew about it, and the old `if feed_logged / else missed_feed` shape sent
 * post alerts looking for a feeding schedule with a post's id -- found nothing,
 * stamped "subject not found", and delivered silence. A switch on the kind
 * fails loudly at the type level the next time a kind is added.
 */
export const buildMessageForAlert = async (
  client: SupabaseClient,
  alert: AlertSubject
): Promise<Omit<ExpoMessage, 'to'> | null> => {
  if (alert.kind === 'post') {
    const { data: post } = await client
      .from('posts')
      .select('id, caption, author_id, post_pets ( pets ( name ) )')
      .eq('id', alert.subject_id)
      .maybeSingle();

    if (!post) return null;

    // author_id is nullable with on delete set null, same as logged_by: a post
    // outlives its author's account and renders as "Member".
    const { data: author } = post.author_id
      ? await client.from('users').select('first_name').eq('id', post.author_id).maybeSingle()
      : { data: null };

    // deno-lint-ignore no-explicit-any
    const petNames = ((post as any).post_pets ?? [])
      // deno-lint-ignore no-explicit-any
      .map((tag: any) => tag.pets?.name)
      .filter((name: string | undefined): name is string => Boolean(name));

    return buildPostMessage({
      authorFirstName: author?.first_name ?? null,
      caption: post.caption,
      petNames,
      postId: post.id
    });
  }

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
