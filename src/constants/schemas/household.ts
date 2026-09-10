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

/**
 * Names the app itself might want to speak with. This list must match the
 * `households_handle_not_reserved` check constraint -- without it a reserved
 * word passes validation, comes back unavailable, and the screen reports it as
 * taken, which is not true.
 */
export const RESERVED_HANDLES = ['admin', 'crumpet', 'support', 'owner', 'help'];

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

/**
 * The same rule `households_handle_format` enforces. The alternation is what
 * forbids a trailing hyphen and a doubled one: every hyphen sits between two
 * alphanumerics.
 */
const HANDLE_SHAPE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const householdHandleSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(HANDLE_MIN, { message: `Use at least ${HANDLE_MIN} characters` })
    .max(HANDLE_MAX, { message: `Use ${HANDLE_MAX} characters or fewer` })
    .regex(/^[a-z]/, { message: 'Start with a letter' })
    .regex(/^[a-z0-9-]*$/, { message: 'Use letters, numbers and hyphens only' })
    .regex(HANDLE_SHAPE, { message: 'Put each hyphen between two letters or numbers' })
    .refine((value) => !RESERVED_HANDLES.includes(value), {
      message: 'That handle is reserved'
    })
});

export type HouseholdHandleInput = z.infer<typeof householdHandleSchema>;
