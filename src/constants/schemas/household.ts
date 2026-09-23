import { z } from 'zod';

// Matches the `households_name_length` check constraint: the schema gives an
// inline error, the constraint holds for any caller that is not this app.
export const HOUSEHOLD_NAME_MAX = 30;

export const householdNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the household a name')
    .max(HOUSEHOLD_NAME_MAX, `Keep it under ${HOUSEHOLD_NAME_MAX} characters`)
});

export type HouseholdNameInput = z.infer<typeof householdNameSchema>;

// Must match the `households_handle_not_reserved` check constraint, or a
// reserved word passes validation and then reports as taken.
export const RESERVED_HANDLES = ['admin', 'crumpet', 'support', 'owner', 'help'];

const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

// The rule `households_handle_format` enforces. The alternation is what forbids
// a trailing or doubled hyphen.
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
