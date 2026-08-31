import { z } from 'zod';

// Mirrors the `length(btrim(title)) between 1 and 80` check on public.reminders.
// Two layers, one number.
export const REMINDER_TITLE_MAX_LENGTH = 80;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const reminderSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Give the reminder a name' })
    .max(REMINDER_TITLE_MAX_LENGTH, {
      message: `Keep the name to ${REMINDER_TITLE_MAX_LENGTH} characters or fewer`
    }),
  kind: z.enum(['feed', 'medication', 'vet']),
  startsOn: z.string().regex(DATE_REGEX, { message: 'Pick a date' }),
  localTime: z.string().regex(TIME_REGEX, { message: 'Enter a valid time, like 09:30' }),
  repeat: z.enum(['once', 'weekly', 'monthly']),
  leadDays: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

export type ReminderFormValues = z.infer<typeof reminderSchema>;
