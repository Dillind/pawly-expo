import { ErrorMessage } from '@/constants/enums';
import { useHousehold } from '@/hooks/queries/use-household';
import { showErrorToast } from '@/lib/toast';
import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * The signed-in member's own delivery preferences.
 *
 * missed_feed_alerts is deliberately not exposed. The column exists, but a
 * toggle for an alert the engine cannot yet fire is a promise the app can't
 * keep.
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const householdId = household?.id;

  const queryKey = ['notification-preferences', householdId, userId];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      HouseholdService.getNotificationPreferences(householdId as string, userId as string),
    enabled: Boolean(householdId) && Boolean(userId)
  });

  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      HouseholdService.setFeedLoggedAlerts({
        householdId: householdId as string,
        userId: userId as string,
        value
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.NotificationSettingsUpdateFailed);
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
