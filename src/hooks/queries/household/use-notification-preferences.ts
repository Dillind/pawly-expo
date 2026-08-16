import { ErrorMessage } from '@/constants/enums';
import { showErrorToast } from '@/lib/toast';
import HouseholdService, { type AlertPreference } from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * The signed-in member's own delivery preferences.
 *
 * missed_feed_alerts is deliberately not exposed. The column exists, but a
 * toggle for an alert the engine cannot yet fire is a promise the app can't
 * keep.
 */
export function useNotificationPreferences(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  const queryKey = ['notification-preferences', householdId, userId];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      HouseholdService.getNotificationPreferences(householdId as string, userId as string),
    enabled: Boolean(householdId) && Boolean(userId)
  });

  const mutation = useMutation({
    mutationFn: ({ preference, value }: { preference: AlertPreference; value: boolean }) =>
      HouseholdService.setAlertPreference({
        householdId: householdId as string,
        userId: userId as string,
        preference,
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
    setPreference: mutation.mutate,
    isSaving: mutation.isPending
  };
}
