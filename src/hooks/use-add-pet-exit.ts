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

  // dismissAll first, because closing from step 3 has to leave the whole flow
  // rather than pop one step. The replace is for a cold start onto one of these
  // routes, where GO_BACK goes unhandled.
  const leave = () => {
    reset();

    if (router.canDismiss()) router.dismissAll();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home/pets');
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
