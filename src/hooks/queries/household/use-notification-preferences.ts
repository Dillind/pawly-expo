import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import HouseholdService, { type AlertPreference } from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import type { LeadMinutes } from '@/types/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** The signed-in member's own delivery preferences, for this household alone. */
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

  const leadMutation = useMutation({
    mutationFn: (leadMinutes: LeadMinutes) =>
      HouseholdService.setFeedDueLeadMinutes({
        householdId: householdId as string,
        userId: userId as string,
        leadMinutes
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.LeadTimeUpdated),
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
    isSaving: mutation.isPending,
    setLeadMinutes: leadMutation.mutate,
    isSavingLeadMinutes: leadMutation.isPending
  };
}
