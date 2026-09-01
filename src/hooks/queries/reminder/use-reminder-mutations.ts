import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import ReminderService, { type ReminderInput } from '@/services/reminder.service';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

function invalidate(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['reminders'] });
  void queryClient.invalidateQueries({ queryKey: ['reminder-days'] });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReminderInput) => ReminderService.create(input),
    onSettled: () => invalidate(queryClient),
    onSuccess: () => showSuccessToast(SuccessMessage.ReminderAdded),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ReminderSaveFailed);
    }
  });
}

export function useRemoveReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reminderId: string) => ReminderService.remove(reminderId),
    onSettled: () => invalidate(queryClient),
    onSuccess: () => showSuccessToast(SuccessMessage.ReminderRemoved),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.ReminderRemoveFailed);
    }
  });
}

type TickInput = { reminderId: string; occurrenceDate: string; isDone: boolean };

/**
 * One mutation for both directions. The row is a toggle, so splitting it would
 * give the call site two pending flags for one control.
 */
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
      console.error(error);
      showErrorToast(
        input.isDone ? ErrorMessage.ReminderUntickFailed : ErrorMessage.ReminderTickFailed
      );
    }
  });
}
