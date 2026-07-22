import { z } from 'zod';

export const verifyOtpSchema = z.object({
  token: z.string().regex(/^\d{6}$/, { message: 'Enter the 6-digit code' })
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;
