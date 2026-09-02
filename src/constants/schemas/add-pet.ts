import { feedTimeSchema } from '@/lib/form/pet-schemas';
import { z } from 'zod';

/**
 * The whole flow's contract, in one schema. The three steps validate slices of
 * it with `trigger`, so a step gate and the final submit cannot disagree about
 * what "valid" means.
 *
 * `breed` is deliberately optional here, unlike petDetailsSchema — a rescue
 * with an unknown mix is the ordinary case, and the placeholder says "not
 * sure...". `birthdate` is required because add_pet casts it to a Postgres
 * `date`, so an empty string fails there rather than here.
 */
export const addPetSchema = z.object({
  name: z.string().trim().min(1, { message: "Enter your pet's name" }),
  petType: z.enum(['dog', 'cat', 'other'], { message: 'Choose a pet type' }),
  sex: z.enum(['male', 'female'], { message: 'Select a sex' }),
  ageMode: z.enum(['birthdate', 'approximate']),
  birthdate: z.string().min(1, { message: 'Choose a date' }),
  breed: z.string(),
  photoUri: z.string().nullable(),
  feedTimes: z.array(feedTimeSchema)
});

export type AddPetFormValues = z.infer<typeof addPetSchema>;

/** The fields step 1 owns. The gate between steps validates exactly these. */
export const ADD_PET_DETAIL_FIELDS = [
  'name',
  'petType',
  'sex',
  'ageMode',
  'birthdate',
  'breed'
] as const;

/** The phase names the stepper draws, in order. */
export const ADD_PET_STEPS = ['Pet details', 'Feed times', 'What they eat'];
