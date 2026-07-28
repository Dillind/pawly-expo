import { supabase } from '@/lib/supabase/client';
import type { FeedingScheduleLabel } from '@/types/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Every mutation invalidates the same two prefixes on settle. Prefix
 * invalidation catches every cached date without enumerating them, which
 * matters because Activity holds one slot-states entry per visible day.
 */
function useInvalidateFeedData(petId: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['slot-states', petId] });
    void queryClient.invalidateQueries({ queryKey: ['feed-logs', petId] });
  }, [queryClient, petId]);
}

export type LogFeedResult =
  | { status: 'logged'; logId: string }
  | {
      status: 'double_feed';
      slot: { label: FeedingScheduleLabel; scheduledTime: string };
      existing: { id: string; loggedAt: string; loggedBy: string | null };
    };

/**
 * The RPC returns jsonb, which supabase-js hands back as `any`. Mapped here
 * rather than cast at the call site so exactly one place knows the wire shape,
 * and an unrecognised status fails loudly instead of rendering an empty
 * warning.
 */
function mapLogFeedResult(data: unknown): LogFeedResult {
  const payload = data as {
    status?: string;
    log_id?: string;
    slot?: { label: FeedingScheduleLabel; scheduled_time: string };
    existing?: { id: string; logged_at: string; logged_by: string | null };
  };

  if (payload.status === 'logged' && payload.log_id) {
    return { status: 'logged', logId: payload.log_id };
  }

  if (payload.status === 'double_feed' && payload.slot && payload.existing) {
    return {
      status: 'double_feed',
      slot: { label: payload.slot.label, scheduledTime: payload.slot.scheduled_time },
      existing: {
        id: payload.existing.id,
        loggedAt: payload.existing.logged_at,
        loggedBy: payload.existing.logged_by
      }
    };
  }

  throw new Error('Unrecognised log_feed response');
}

/**
 * The only write path for a feed log. `log_feed` decides and inserts in one
 * transaction, so two members logging the same slot at the same moment cannot
 * both be told there is no double feed -- see the migration for why
 * check-then-insert as two round trips was rejected.
 *
 * Writes are deliberately NOT optimistic. RLS can genuinely reject the insert,
 * and an optimistic row that silently rolls back is exactly the "the app said
 * the pet was fed when it wasn't" failure the product brief calls
 * trust-collapsing.
 *
 * A `double_feed` result means nothing was written. Calling again with
 * `confirmed: true` writes unconditionally.
 */
export function useLogFeed(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);

  return useMutation({
    mutationFn: async (input: {
      loggedAt?: string;
      notes?: string | null;
      confirmed?: boolean;
    }): Promise<LogFeedResult> => {
      const { data, error } = await supabase.rpc('log_feed', {
        target_pet_id: petId,
        target_logged_at: input.loggedAt ?? new Date().toISOString(),
        target_notes: input.notes ?? null,
        confirmed: input.confirmed ?? false
      });

      if (error) throw error;

      return mapLogFeedResult(data);
    },
    onSettled: invalidate
  });
}

/**
 * The update payload names only logged_at and notes -- the client's UPDATE
 * grant is narrowed to exactly those two columns, so pet_id, logged_by,
 * created_at and id can never appear here.
 *
 * `loggedAt` and `notes` are both optional and only the ones actually passed
 * are written. The feed-log correction sheet relies on this: a notes-only
 * edit must never touch logged_at, even by re-writing its current value --
 * the UI's Today/Yesterday control cannot represent every date the database
 * accepts (Owners have no backdating floor), so it must not be able to move
 * a date it cannot faithfully redisplay. Sending nothing at all (no key
 * changed) is the caller's bug to avoid, not this hook's to guard against --
 * Postgres accepts a no-op `update set` fine.
 */
export function useUpdateFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { logId: string; loggedAt?: string; notes?: string | null }) => {
      const patch: { logged_at?: string; notes?: string | null } = {};

      if (input.loggedAt !== undefined) patch.logged_at = input.loggedAt;
      if (input.notes !== undefined) patch.notes = input.notes;

      const { error } = await supabase.from('feed_logs').update(patch).eq('id', input.logId);

      if (error) throw error;
    },
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['feed-log', variables.logId] });
    }
  });
}

/**
 * Hard delete — Undo and "delete this log" are the same operation. Soft
 * deletion would add `deleted_at is null` to every read path including the
 * slot matcher and the missed-feed cron; one forgotten filter and a deleted
 * feed silently satisfies a slot.
 */
export function useDeleteFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { logId: string }) => {
      const { error } = await supabase.from('feed_logs').delete().eq('id', input.logId);

      if (error) throw error;
    },
    onSettled: (_data, _error, variables) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['feed-log', variables.logId] });
    }
  });
}
