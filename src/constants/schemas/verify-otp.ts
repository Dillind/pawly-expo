import { z } from 'zod';

export const verifyOtpSchema = z.object({
  token: z.string().regex(/^\d{8}$/, { message: 'Enter the 8-digit code' })
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;
