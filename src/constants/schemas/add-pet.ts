import { petDetailsSchema } from '@/constants/schemas/pet-details';
import { feedingScheduleSchema } from '@/constants/schemas/feeding-schedule';
import { z } from 'zod';

/**
 * Onboarding splits these across two screens because it is a first run. Adding a
 * second pet is one screen, so the two schemas are merged rather than restated.
 * The timezone is not here -- it belongs to the household, which already has one.
 */
export const addPetSchema = petDetailsSchema.extend({
  feedingTimes: feedingScheduleSchema.shape.feedingTimes
});

export type AddPetFormValues = z.infer<typeof addPetSchema>;
