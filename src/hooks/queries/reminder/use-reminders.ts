import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import ReminderService from '@/services/reminder.service';

const REMINDERS_STALE_MS = 15_000;

// `date` is an ISO YYYY-MM-DD string in the household's timezone.
export function useReminders(petId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reminders.day(petId, date),
    queryFn: () => ReminderService.listForDay(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date),
    staleTime: REMINDERS_STALE_MS
  });
}

export function useUpcomingReminders(
  petId: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.reminders.range(petId, fromDate, toDate),
    queryFn: () => ReminderService.listRange(petId as string, fromDate as string, toDate as string),
    enabled: Boolean(petId) && Boolean(fromDate) && Boolean(toDate),
    staleTime: REMINDERS_STALE_MS
  });
}

export function useReminderDays(
  householdId: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.reminderDays.range(householdId, fromDate, toDate),
    queryFn: () =>
      ReminderService.daysWithReminders(
        householdId as string,
        fromDate as string,
        toDate as string
      ),
    enabled: Boolean(householdId) && Boolean(fromDate) && Boolean(toDate),
    staleTime: REMINDERS_STALE_MS
  });
}
