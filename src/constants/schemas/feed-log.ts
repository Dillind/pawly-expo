import { z } from 'zod';

import { composeLoggedAt, dayjs } from '@/lib/dates';

// Mirrors the `length(notes) <= 280` check on public.feed_logs.
export const FEED_LOG_NOTES_MAX_LENGTH = 280;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const notesField = z.string().max(FEED_LOG_NOTES_MAX_LENGTH, {
  message: `Keep notes to ${FEED_LOG_NOTES_MAX_LENGTH} characters or fewer`
});

// Built per-caller because the RLS floor is role-dependent: Contributors may
// not backdate past 24 hours, Owners have no floor. The Today/Yesterday control
// does not satisfy that floor -- "yesterday 00:00" at "today 23:59" is 48h.
export function feedLogSchema({ isOwner, timezone }: { isOwner: boolean; timezone: string }) {
  return z
    .object({
      day: z.enum(['today', 'yesterday']),
      time: z.string().regex(TIME_REGEX, { message: 'Enter a valid time, like 07:30' }),
      notes: notesField
    })
    .superRefine((values, ctx) => {
      const loggedAt = composeLoggedAt(values.day, values.time, timezone);

      if (dayjs(loggedAt).isAfter(dayjs())) {
        ctx.addIssue({
          code: 'custom',
          path: ['time'],
          message: "That time hasn't happened yet"
        });
        return;
      }

      if (!isOwner && dayjs().diff(dayjs(loggedAt), 'hour') >= 24) {
        ctx.addIssue({
          code: 'custom',
          path: ['time'],
          message: 'That time is more than 24 hours ago'
        });
      }
    });
}

export type FeedLogFormValues = z.infer<ReturnType<typeof feedLogSchema>>;

// No backdating floor: the day is always today. The no-future ceiling still
// binds, because RLS rejects a logged_at later than now().
export function newFeedLogSchema({ timezone }: { timezone: string }) {
  return z
    .object({
      time: z.string().regex(TIME_REGEX, { message: 'Enter a valid time, like 07:30' }),
      notes: notesField
    })
    .superRefine((values, ctx) => {
      if (dayjs(composeLoggedAt('today', values.time, timezone)).isAfter(dayjs())) {
        ctx.addIssue({
          code: 'custom',
          path: ['time'],
          message: "That time hasn't happened yet"
        });
      }
    });
}

export type NewFeedLogFormValues = z.infer<ReturnType<typeof newFeedLogSchema>>;

// A log older than yesterday edits notes only, so there are no day or time
// fields for this schema to validate.
export const feedLogNotesOnlySchema = z.object({ notes: notesField });

export type FeedLogNotesOnlyFormValues = z.infer<typeof feedLogNotesOnlySchema>;
