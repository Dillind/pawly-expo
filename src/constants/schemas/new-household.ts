import { z } from 'zod';

import { householdHandleSchema, householdNameSchema } from '@/constants/schemas/household';
import { feedTimeSchema } from '@/lib/form/pet-schemas';

// One schema for the whole flow, so a step gate and the final submit cannot
// disagree about what "valid" means. Neither age nor breed is asked for: a
// flow that asks five things before a first feed can be logged is one people
// abandon, and both are on the pet's own screen afterwards.
export const newHouseholdSchema = z.object({
  name: householdNameSchema.shape.name,
  handle: householdHandleSchema.shape.handle,
  isListed: z.boolean(),
  petName: z.string().trim().min(1, { message: "Enter your pet's name" }),
  petType: z.enum(['dog', 'cat', 'other'], { message: 'Choose a pet type' }),
  sex: z.enum(['male', 'female'], { message: 'Select a sex' }),
  photoUri: z.string().nullable(),
  feedTimes: z.array(feedTimeSchema)
});

export type NewHouseholdFormValues = z.infer<typeof newHouseholdSchema>;

export const NEW_HOUSEHOLD_STEP_COUNT = 4;

export const NEW_HOUSEHOLD_NAME_FIELDS = ['name', 'handle'] as const;

export const NEW_HOUSEHOLD_PET_FIELDS = ['petName', 'petType', 'sex'] as const;
