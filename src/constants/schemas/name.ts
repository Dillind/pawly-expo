import { z } from 'zod';

export const nameSchema = z.object({
  firstName: z.string().trim().min(1, { message: 'Enter your first name' }),
  lastName: z.string().trim().min(1, { message: 'Enter your last name' })
});

export type NameFormValues = z.infer<typeof nameSchema>;

// Apple does not always share a last name, so an existing account may have none.
export const editNameSchema = nameSchema.extend({ lastName: z.string().trim() });
