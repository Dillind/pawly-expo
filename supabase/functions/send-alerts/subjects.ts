import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  buildFeedDueMessage,
  buildFeedLoggedMessage,
  buildMissedFeedMessage,
  buildPostCommentedMessage,
  buildPostMessage,
  type ExpoMessage,
  type FeedDuePet,
  type ScheduleLabel
} from './message.ts';

export type AlertKind =
  | 'feed_logged'
  | 'missed_feed'
  | 'feed_due'
  | 'post'
  | 'post_commented';

/**
 * A deliberate third outcome, alongside a message and null.
 *
 * null means the subject is gone and the alert can never be sent, which is a
 * failure worth stamping as one. A suppression is not a failure: the household
 * fed its pets between queue and send, which is the feature working.
 */
export type BuiltMessage = Omit<ExpoMessage, 'to'> | { suppressed: string } | null;

type AlertSubject = {
  kind: AlertKind;
  subject_id: string;
  /** The local day the alert is about. missed_feed and feed_due carry one. */
  subject_date: string | null;
  /** The instant the feeds are due. feed_due only. */
  subject_at: string | null;
  /** Set on a directed alert. post_commented is the only pushing kind with one. */
  recipient_id: string | null;
};

/**
 * subject_id is a feed_logs.id for feed_logged, a feed_times.series_id for
 * missed_feed, a posts.id for post, and a post_comments.id for post_commented.
 * Null means the row is gone -- deleted between queue and dispatch.
 *
 * The switch is exhaustive: the default branch assigns the kind to `never`, so
 * adding a sixth alert_kind fails to compile.
 *
 * feed_due is the exception: its subject_id is the HOUSEHOLD, and the set of
 * pets is rebuilt here rather than stored. See ADR 0033.
 *
 * comment_liked never reaches here -- it is queued suppressed.
 */
export const buildMessageForAlert = async (
  client: SupabaseClient,
  alert: AlertSubject
): Promise<BuiltMessage> => {
  switch (alert.kind) {
    case 'post_commented': {
      const { data: comment } = await client
        .from('post_comments')
        .select('id, body, author_id, post_id, reply_to_user_id, posts ( id, author_id )')
        .eq('id', alert.subject_id)
        .maybeSingle();

      if (!comment) return null;

      const { data: author } = comment.author_id
        ? await client.from('users').select('first_name').eq('id', comment.author_id).maybeSingle()
        : { data: null };

      // deno-lint-ignore no-explicit-any
      const post = (comment as any).posts;

      return buildPostCommentedMessage({
        authorFirstName: author?.first_name ?? null,
        body: comment.body,
        // reply_to_user_id, NOT the parent's author: a reply answering a
        // SIBLING flattens under the same parent, so the parent's author would
        // be told about a sentence aimed at someone else.
        isReplyToRecipient:
          comment.reply_to_user_id != null && comment.reply_to_user_id === alert.recipient_id,
        isPostAuthor: post?.author_id != null && post.author_id === alert.recipient_id,
        postId: comment.post_id
      });
    }

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

    case 'feed_due': {
      if (!alert.subject_date || !alert.subject_at) return null;

      const { data: pets } = await client
        .from('pets')
        .select('id, name')
        .eq('household_id', alert.subject_id);

      if (!pets || pets.length === 0) return null;

      const due: FeedDuePet[] = [];
      let scheduledTime: string | null = null;

      // The rebuild IS the freshness check -- there is no separate "was it
      // logged in the meantime" query. A pet fed since the sweep drops out of
      // the message on its own, and a household that fed everything produces a
      // suppression instead of a push.
      for (const pet of pets) {
        const { data: states } = await client.rpc('pet_occurrence_states', {
          target_pet_id: pet.id,
          target_date: alert.subject_date
        });

        for (const state of states ?? []) {
          const isThisInstant =
            new Date(state.scheduled_at).getTime() === new Date(alert.subject_at).getTime();

          if (!isThisInstant || state.satisfying_log_id) continue;

          due.push({ name: pet.name, label: state.label as ScheduleLabel });
          scheduledTime = state.local_time;
        }
      }

      if (due.length === 0 || !scheduledTime) return { suppressed: 'already fed' };

      return buildFeedDueMessage({ pets: due, scheduledTime });
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
