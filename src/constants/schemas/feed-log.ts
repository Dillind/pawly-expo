import { composeLoggedAt, dayjs } from '@/lib/dates';
import { z } from 'zod';

// Mirrors the `length(notes) <= 280` check on public.feed_logs. Two layers,
// one number.
export const FEED_LOG_NOTES_MAX_LENGTH = 280;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const notesField = z.string().max(FEED_LOG_NOTES_MAX_LENGTH, {
  message: `Keep notes to ${FEED_LOG_NOTES_MAX_LENGTH} characters or fewer`
});

/**
 * The correction form for a log made today or yesterday (household
 * timezone) -- see feed-log-detail-sheet.tsx for why older logs never
 * reach this schema at all.
 *
 * Built per-caller from role and timezone rather than exported as a static
 * object, because the feed_logs RLS floor is role-dependent (design doc,
 * Row Level Security): Contributors may not backdate more than 24 hours,
 * Owners have no floor. The Today/Yesterday control does NOT make that
 * floor automatically true -- "yesterday 00:00" checked at "today 23:59" is
 * nearly 48 hours back -- so it has to be checked here rather than assumed
 * satisfied by the control's range. The no-future ceiling binds everyone,
 * Owners included.
 */
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

/**
 * The correction form for a log older than yesterday: the Today/Yesterday
 * control cannot represent its date, so feed-log-detail-sheet.tsx renders
 * that date as read-only text and offers notes editing only. No day/time
 * fields here at all -- there is nothing for this schema to validate them
 * against.
 */
export const feedLogNotesOnlySchema = z.object({ notes: notesField });

export type FeedLogNotesOnlyFormValues = z.infer<typeof feedLogNotesOnlySchema>;
