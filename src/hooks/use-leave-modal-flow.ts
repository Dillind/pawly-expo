import { useRouter, type Href } from 'expo-router';
import { useFormContext } from 'react-hook-form';

export const useLeaveModalFlow = (firstStep: Href) => {
  const router = useRouter();
  const { reset } = useFormContext();

  // In this order only: `dismissTo` leaves the modal as the one thing to pop. `dismissAll` also
  // popped the screen below, and reading `canGoBack` in between saw stale state.
  return () => {
    reset();
    router.dismissTo(firstStep);
    router.back();
  };
};
