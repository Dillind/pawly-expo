import { ErrorMessage } from '@/constants/enums';
import { showErrorToast } from '@/lib/toast';
import AlertService, { ALERTS_PAGE_SIZE, type AlertsCursor } from '@/services/alert.service';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const alertsKey = (householdId: string | undefined) => ['alerts', householdId];
export const unreadAlertsKey = (householdId: string | undefined) => ['alerts-unread', householdId];

/** The inbox. Cursor on `(created_at, id) desc`, 30 per page. */
export function useAlerts(householdId: string | undefined) {
  return useInfiniteQuery({
    queryKey: alertsKey(householdId),
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

/** Drives the bell's badge, so it must not pull the whole history to count. */
export function useUnreadAlertCount(householdId: string | undefined) {
  return useQuery({
    queryKey: unreadAlertsKey(householdId),
    queryFn: () => AlertService.unreadCount(householdId as string),
    enabled: Boolean(householdId)
  });
}

/**
 * Rows mark themselves read as they are seen, so this deliberately does not
 * invalidate the list — re-sorting under the reader while they are looking at
 * it is the failure being avoided. Only the badge refreshes.
 */
export function useMarkAlertsRead(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertIds: string[]) => AlertService.markRead(alertIds),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: unreadAlertsKey(householdId) }),
    onError: (error) => console.error(error)
  });
}

export function useMarkAllAlertsRead(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AlertService.markAllRead(householdId as string),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: unreadAlertsKey(householdId) });
      void queryClient.invalidateQueries({ queryKey: alertsKey(householdId) });
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.AlertsMarkReadFailed);
    }
  });
}
