import ReminderService from '@/services/reminder.service';
import { useQuery } from '@tanstack/react-query';

const REMINDERS_STALE_MS = 15_000;

/** `date` is an ISO YYYY-MM-DD string in the household's timezone. */
export function useReminders(petId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['reminders', petId, date],
    queryFn: () => ReminderService.listForDay(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date),
    staleTime: REMINDERS_STALE_MS
  });
}

/** The dots under the week strip. One query for the whole week. */
export function useReminderDays(
  householdId: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined
) {
  return useQuery({
    queryKey: ['reminder-days', householdId, fromDate, toDate],
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
