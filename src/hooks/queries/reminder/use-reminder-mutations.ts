import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import ReminderService, { type ReminderInput } from '@/services/reminder.service';

function invalidate(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.reminderDays.all });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.ReminderAdded,
      errorMessage: ErrorMessage.ReminderSaveFailed
    },
    mutationFn: (input: ReminderInput) => ReminderService.create(input),
    onSettled: () => invalidate(queryClient)
  });
}

export function useRemoveReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.ReminderRemoved,
      errorMessage: ErrorMessage.ReminderRemoveFailed
    },
    mutationFn: (reminderId: string) => ReminderService.remove(reminderId),
    onSettled: () => invalidate(queryClient)
  });
}

export type TickInput = { reminderId: string; occurrenceDate: string; isDone: boolean };

// One mutation drives a whole card of rows, so `isPending` alone would put every visible Done
// chip into its loading state while one row ticks.
export const isTickPending = (
  isPending: boolean,
  variables: TickInput | undefined,
  reminderId: string,
  occurrenceDate: string
) =>
  isPending && variables?.reminderId === reminderId && variables?.occurrenceDate === occurrenceDate;

// One mutation for both directions. The row is a toggle, so splitting it would give the call
// site two pending flags for one control.
export function useTickReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reminderId, occurrenceDate, isDone }: TickInput) =>
      isDone
        ? ReminderService.removeCompletion(reminderId, occurrenceDate)
        : ReminderService.complete(reminderId, occurrenceDate),
    onSettled: () => invalidate(queryClient),
    onSuccess: (_data, input) =>
      showSuccessToast(
        input.isDone ? SuccessMessage.ReminderUnticked : SuccessMessage.ReminderTicked
      ),
    onError: (error, input) => {
      showErrorToast(
        input.isDone ? ErrorMessage.ReminderUntickFailed : ErrorMessage.ReminderTickFailed
      );
    }
  });
}
