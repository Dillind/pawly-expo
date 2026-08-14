import { z } from 'zod';

/**
 * 30 characters, matching the `households_name_length` check constraint. Both
 * halves are needed: the schema gives the user an inline error, the constraint
 * is what holds for any caller that is not this app.
 */
export const HOUSEHOLD_NAME_MAX = 30;

export const householdNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the household a name')
    .max(HOUSEHOLD_NAME_MAX, `Keep it under ${HOUSEHOLD_NAME_MAX} characters`)
});

export type HouseholdNameInput = z.infer<typeof householdNameSchema>;
