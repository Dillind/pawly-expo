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

  const leave = () => {
    reset();

    if (router.canDismiss()) router.dismissAll();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
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
