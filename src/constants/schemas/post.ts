import { z } from 'zod';

export const CAPTION_MAX = 280;

export const postSchema = z.object({
  localUri: z.string().min(1, { message: 'Add a photo to post' }),
  caption: z.string().max(CAPTION_MAX, { message: `Keep it under ${CAPTION_MAX} characters` }),
  petIds: z.array(z.string())
});

export type PostFormValues = z.infer<typeof postSchema>;
