import { z } from 'zod';

export const SCHEDULE_LABELS = ['morning', 'lunch', 'dinner', 'custom'] as const;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

export const feedTimeSchema = z.object({
  label: z.enum(SCHEDULE_LABELS),
  localTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
  // 0 is Sunday, matching Postgres `extract(dow ...)`.
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, 'Pick at least one day'),
  instructions: z.string().max(500, 'Keep it under 500 characters').nullable()
});

export type FeedTimeInput = z.infer<typeof feedTimeSchema>;

export const bioSchema = z.object({
  bio: z.string().max(500, 'Keep it under 500 characters').nullable()
});

export type BioInput = z.infer<typeof bioSchema>;

export const careCardSchema = z.object({
  allergies: z.string().nullable(),
  behaviourNotes: z.string().nullable(),
  vetName: z.string().nullable(),
  vetPhone: z.string().nullable(),
  emergencyVetName: z.string().nullable(),
  emergencyVetPhone: z.string().nullable(),
  microchipNumber: z.string().nullable(),
  insuranceProvider: z.string().nullable(),
  insurancePolicyNumber: z.string().nullable(),
  feedingNotes: z.string().nullable(),
  walkRoutine: z.string().nullable(),
  whereThingsAre: z.string().nullable(),
  notes: z.string().nullable()
});

export const medicationSchema = z.object({
  name: z.string().min(1, 'Give the medication a name'),
  dose: z.string().nullable(),
  scheduleText: z.string().nullable(),
  instructions: z.string().nullable()
});

export const careCardContactSchema = z.object({
  name: z.string().trim().min(1, "Add the person's name"),
  phone: z.string().trim().min(1, 'Add a number for them')
});

export type CareCardInput = z.infer<typeof careCardSchema>;
export type CareCardContactInput = z.infer<typeof careCardContactSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
