import { useRouter } from 'expo-router';
import { useFormContext, useWatch } from 'react-hook-form';
import { Alert } from 'react-native';

import type { NewHouseholdFormValues } from '@/constants/schemas/new-household';

// A decision the user has to make now: nothing is written until the last step,
// so leaving loses everything and there is no draft to come back to.
export const useNewHouseholdExit = () => {
  const router = useRouter();

  const { control, reset } = useFormContext<NewHouseholdFormValues>();
  const petName = useWatch({ control, name: 'petName' });

  // Two dispatches, in this order and no other. `dismissTo` takes the flow's
  // own stack back to step 1, so the `back` that follows has exactly one thing
  // left to pop: the modal. `dismissAll` popped the presenting screen as well,
  // and reading `canGoBack` between the two read the state before the first
  // had applied, which fired GO_BACK at an empty stack.
  const leave = () => {
    reset();

    router.dismissTo('/home/new-household');
    router.back();
  };

  const exit = () => {
    const pet = petName.trim();

    Alert.alert(
      'Leave setup?',
      `Your household${pet ? ` and ${pet}` : ''} won't be saved. Nothing has been created yet.`,
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        { text: 'Leave', style: 'destructive', onPress: leave }
      ]
    );
  };

  return { exit };
};
