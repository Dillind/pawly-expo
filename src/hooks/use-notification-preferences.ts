import { useHousehold } from '@/hooks/use-household';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type NotificationPreferences = {
  feedLoggedAlerts: boolean;
};

async function fetchPreferences(
  householdId: string,
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('household_members')
    .select('feed_logged_alerts')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  return { feedLoggedAlerts: data.feed_logged_alerts };
}

/**
 * The signed-in member's own delivery preferences.
 *
 * missed_feed_alerts is deliberately not exposed. The column exists, but the
 * engine that would fire that alert does not, and a toggle for an alert that
 * cannot arrive is a promise the app can't keep.
 *
 * These are the same columns the send query reads, so what this screen shows is
 * what actually governs delivery -- not a local mirror of it.
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const householdId = household?.id;

  const queryKey = ['notification-preferences', householdId, userId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPreferences(householdId as string, userId as string),
    enabled: Boolean(householdId) && Boolean(userId)
  });

  const mutation = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase
        .from('household_members')
        .update({ feed_logged_alerts: value })
        .eq('household_id', householdId as string)
        .eq('user_id', userId as string);

      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    setFeedLoggedAlerts: mutation.mutate,
    isSaving: mutation.isPending
  };
}
