import { z } from 'zod';

export const SCHEDULE_LABELS = ['morning', 'lunch', 'dinner', 'custom'] as const;

export const slotSchema = z.object({
  label: z.enum(SCHEDULE_LABELS),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time')
});

export type SlotInput = z.infer<typeof slotSchema>;

export const bioSchema = z.object({
  bio: z.string().max(500, 'Keep it under 500 characters').nullable()
});

export type BioInput = z.infer<typeof bioSchema>;
