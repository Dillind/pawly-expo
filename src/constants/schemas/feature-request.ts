import { z } from 'zod';

// Match the check constraints on `feature_requests`, so the form errors inline first.
export const FEATURE_REQUEST_TITLE_MAX = 80;
export const FEATURE_REQUEST_DESCRIPTION_MAX = 500;

export const featureRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your request a title')
    .max(FEATURE_REQUEST_TITLE_MAX, `Keep it under ${FEATURE_REQUEST_TITLE_MAX} characters`),
  description: z
    .string()
    .trim()
    .max(
      FEATURE_REQUEST_DESCRIPTION_MAX,
      `Keep it under ${FEATURE_REQUEST_DESCRIPTION_MAX} characters`
    )
});

export type FeatureRequestInput = z.infer<typeof featureRequestSchema>;
