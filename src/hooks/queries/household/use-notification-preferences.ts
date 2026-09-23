import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import HouseholdService, { type AlertPreference } from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import type { LeadMinutes } from '@/types/core';

export function useNotificationPreferences(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  const queryKey = queryKeys.notificationPreferences(householdId, userId);

  const query = useQuery({
    queryKey,
    queryFn: () =>
      HouseholdService.getNotificationPreferences(householdId as string, userId as string),
    enabled: Boolean(householdId) && Boolean(userId)
  });

  const mutation = useMutation({
    meta: { errorMessage: ErrorMessage.NotificationSettingsUpdateFailed },
    mutationFn: ({ preference, value }: { preference: AlertPreference; value: boolean }) =>
      HouseholdService.setAlertPreference({
        householdId: householdId as string,
        userId: userId as string,
        preference,
        value
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    }
  });

  const leadMutation = useMutation({
    meta: {
      successMessage: SuccessMessage.LeadTimeUpdated,
      errorMessage: ErrorMessage.NotificationSettingsUpdateFailed
    },
    mutationFn: (leadMinutes: LeadMinutes) =>
      HouseholdService.setFeedDueLeadMinutes({
        householdId: householdId as string,
        userId: userId as string,
        leadMinutes
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
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
