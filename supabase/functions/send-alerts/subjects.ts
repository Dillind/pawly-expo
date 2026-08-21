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
  /** The local day the alert is about. Only a missed_feed carries one. */
  subject_date: string | null;
};

/**
 * subject_id is a feed_logs.id for feed_logged, a feed_times.series_id for
 * missed_feed, and a posts.id for post. Null means the row is gone -- deleted
 * between queue and dispatch.
 *
 * The switch is exhaustive: the default branch assigns the kind to `never`, so
 * adding a fourth alert_kind fails to compile rather than being silently
 * handled as a missed feed.
 */
export const buildMessageForAlert = async (
  client: SupabaseClient,
  alert: AlertSubject
): Promise<Omit<ExpoMessage, 'to'> | null> => {
  switch (alert.kind) {
    case 'post': {
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

    case 'feed_logged': {
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

    case 'missed_feed': {
      if (!alert.subject_date) return null;

      // The version that applied on the day being nudged about, not the current
      // one. A feed time is versioned, so "dinner at 6" has to be read through
      // the schedule that was in force then -- see ADR 0030.
      const { data: feedTime } = await client
        .from('feed_times')
        .select('local_time, label, pets ( name )')
        .eq('series_id', alert.subject_id)
        .contains('effective', `[${alert.subject_date},${alert.subject_date}]`)
        .maybeSingle();

      if (!feedTime) return null;

      // deno-lint-ignore no-explicit-any
      const pet = (feedTime as any).pets;

      return buildMissedFeedMessage({
        petName: pet.name,
        label: feedTime.label as ScheduleLabel,
        scheduledTime: feedTime.local_time
      });
    }

    default: {
      const unhandled: never = alert.kind;
      console.error(`Unhandled alert kind: ${String(unhandled)}`);
      return null;
    }
  }
};
