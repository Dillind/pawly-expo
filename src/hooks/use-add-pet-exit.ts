import { useRouter } from 'expo-router';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { ActionSheetIOS, Alert } from 'react-native';

import type { AddPetFormValues } from '@/constants/schemas/add-pet';
import { isIOS } from '@/utils/platform';

// Every step closes the same way, so the discard prompt cannot live on step 1.
export const useAddPetExit = () => {
  const router = useRouter();

  const { control, reset } = useFormContext<AddPetFormValues>();
  const { isDirty } = useFormState({ control });
  const petName = useWatch({ control, name: 'name' });

  // Two dispatches, in this order and no other. `dismissTo` takes the flow's
  // own stack back to step 1, so the `back` that follows has exactly one thing
  // left to pop: the modal. `dismissAll` popped the presenting screen as well,
  // and reading `canGoBack` between the two read the state before the first
  // had applied, which fired GO_BACK at an empty stack.
  const leave = () => {
    reset();

    router.dismissTo('/home/add-pet');
    router.back();
  };

  const exit = () => {
    if (!isDirty) {
      leave();
      return;
    }

    const title = `You have not added ${petName.trim() || 'this pet'} yet`;
    const message = 'Everything you have entered will be lost.';

    if (isIOS) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: ['Keep editing', 'Discard'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1
        },
        (index) => {
          if (index === 1) leave();
        }
      );
      return;
    }

    Alert.alert(title, message, [
      { text: 'Keep editing', style: 'cancel', isPreferred: true },
      { text: 'Discard', style: 'destructive', onPress: leave }
    ]);
  };

  return { exit };
};
