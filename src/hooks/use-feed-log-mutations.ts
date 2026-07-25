import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
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

/**
 * Writes are deliberately NOT optimistic. RLS can genuinely reject an insert,
 * and an optimistic row that silently rolls back is exactly the "the app said
 * the pet was fed when it wasn't" failure the product brief calls
 * trust-collapsing. The toast fires on success.
 *
 * The insert payload names only pet_id, logged_by and logged_at -- the
 * client's INSERT grant is narrowed to (pet_id, logged_by, logged_at, notes)
 * and cannot include id or created_at at all, even as undefined keys, so the
 * server-generated id is read back via .select() rather than supplied.
 */
export function useLogFeed(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: async (input: { loggedAt?: string }): Promise<string> => {
      const { data, error } = await supabase
        .from('feed_logs')
        .insert({
          pet_id: petId,
          logged_by: userId,
          logged_at: input.loggedAt ?? new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id as string;
    },
    onSettled: invalidate
  });
}

/**
 * The update payload names only logged_at and notes -- the client's UPDATE
 * grant is narrowed to exactly those two columns, so pet_id, logged_by,
 * created_at and id can never appear here.
 */
export function useUpdateFeedLog(petId: string | undefined) {
  const invalidate = useInvalidateFeedData(petId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { logId: string; loggedAt: string; notes: string | null }) => {
      const { error } = await supabase
        .from('feed_logs')
        .update({ logged_at: input.loggedAt, notes: input.notes })
        .eq('id', input.logId);

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
