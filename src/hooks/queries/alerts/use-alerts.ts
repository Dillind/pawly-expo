import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { ErrorMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import AlertService, { ALERTS_PAGE_SIZE, type AlertsCursor } from '@/services/alert.service';

// The inbox. Cursor on `(created_at, id) desc`.
export function useAlerts(householdId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.alerts(householdId),
    queryFn: ({ pageParam }) => AlertService.listPage(householdId as string, pageParam),
    initialPageParam: null as AlertsCursor | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < ALERTS_PAGE_SIZE) return null;

      const last = lastPage[lastPage.length - 1];

      return { createdAt: last.createdAt, id: last.id };
    },
    enabled: Boolean(householdId)
  });
}

export function useUnreadAlertCount(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.unreadAlerts(householdId),
    queryFn: () => AlertService.unreadCount(householdId as string),
    enabled: Boolean(householdId)
  });
}

// A separate query from the list, so refreshing only the rows would clear them
// under a count that still says three unread.
export function useRefreshUnreadAlertCount(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.refetchQueries({ queryKey: queryKeys.unreadAlerts(householdId) }),
    [queryClient, householdId]
  );
}

// Only the badge refreshes: invalidating the list re-sorts it under someone
// still reading it.
export function useMarkAlertsRead(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertIds: string[]) => AlertService.markRead(alertIds),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadAlerts(householdId) })
  });
}

export function useMarkAllAlertsRead(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.AlertsMarkReadFailed },
    mutationFn: () => AlertService.markAllRead(householdId as string),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadAlerts(householdId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts(householdId) });
    }
  });
}
