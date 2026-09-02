import { z } from 'zod';

export const petDetailsSchema = z.object({
  name: z.string().min(1, { message: "Enter your pet's name" }),
  petType: z.enum(['dog', 'cat', 'other'], { message: 'Select a pet type' }),
  breedId: z.string().nullable(),
  sex: z.enum(['male', 'female'], { message: 'Select a sex' }),
  birthdate: z.string().min(1, { message: "Enter your pet's birthdate" }),
  birthdateIsApproximate: z.boolean(),
  photoUri: z.string().nullable()
});

export type PetDetailsFormValues = z.infer<typeof petDetailsSchema>;

export const petDetailsEditSchema = petDetailsSchema.omit({ photoUri: true });

export type PetDetailsEditValues = z.infer<typeof petDetailsEditSchema>;
