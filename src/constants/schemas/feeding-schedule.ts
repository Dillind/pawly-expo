import { z } from 'zod';

export const feedingScheduleSchema = z.object({
  timezone: z.string().min(1, { message: 'Select a timezone' }),
  feedingTimes: z
    .array(
      z.object({
        time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Enter a valid time' }),
        label: z.enum(['morning', 'lunch', 'dinner', 'custom'])
      })
    )
    .min(1, { message: 'Add at least one feeding time' })
});

export type FeedingScheduleFormValues = z.infer<typeof feedingScheduleSchema>;
