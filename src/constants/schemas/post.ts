import { z } from 'zod';

export const TITLE_MAX = 80;

export const CAPTION_MAX = 280;

/** Also enforced in `assert_post_photo_paths`, which is the one that binds. */
export const PHOTO_CAP = 10;

/**
 * A photo in the composer is either already in the bucket or was just picked.
 * Both carry a `uri` so the strip renders them the same way; only the branch
 * decides whether saving has to upload anything.
 */
const postPhotoSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('existing'),
    storagePath: z.string().min(1),
    uri: z.string().min(1)
  }),
  z.object({
    kind: z.literal('new'),
    uri: z.string().min(1)
  })
]);

export const postSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Give your post a title' })
    .max(TITLE_MAX, { message: `Keep it under ${TITLE_MAX} characters` }),
  photos: z
    .array(postPhotoSchema)
    .min(1, { message: 'Add a photo to post' })
    .max(PHOTO_CAP, { message: `A post holds up to ${PHOTO_CAP} photos` }),
  caption: z.string().max(CAPTION_MAX, { message: `Keep it under ${CAPTION_MAX} characters` }),
  petIds: z.array(z.string())
});

export type PostPhotoValue = z.infer<typeof postPhotoSchema>;
export type PostFormValues = z.infer<typeof postSchema>;
