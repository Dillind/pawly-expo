import { useState } from 'react';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { logError, userFacingMessage } from '@/lib/errors';
import { hapticLight } from '@/lib/haptics';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';

const CANCELLED = ['ERR_REQUEST_CANCELED', 'ERR_CANCELED', 'SIGN_IN_CANCELLED', '-5', '12501'];

const isCancellation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  CANCELLED.includes(String((error as { code: unknown }).code));

export const useSocialAuth = () => {
  const [isPending, setIsPending] = useState(false);

  const run = async (signIn: () => Promise<unknown | null>) => {
    if (isPending) return;

    hapticLight();
    setIsPending(true);

    try {
      const result = await signIn();

      if (result === null) return;

      showSuccessToast(SuccessMessage.SignedIn);
    } catch (error) {
      if (isCancellation(error)) return;

      logError(error);
      showErrorToast(ErrorMessage.SignInFailed, userFacingMessage(error, 'Try again'));
    } finally {
      setIsPending(false);
    }
  };

  return {
    signInWithApple: () => run(AuthService.signInWithApple),
    signInWithGoogle: () => run(AuthService.signInWithGoogle),
    isPending
  };
};
