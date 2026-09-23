import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { ActionSheetIOS, Alert } from 'react-native';

import type { AddPetFormValues } from '@/constants/schemas/add-pet';
import { useLeaveModalFlow } from '@/hooks/use-leave-modal-flow';
import { isIOS } from '@/utils/platform';

// Every step closes the same way, so the discard prompt cannot live on step 1.
export const useAddPetExit = () => {
  const { control } = useFormContext<AddPetFormValues>();
  const { isDirty } = useFormState({ control });
  const petName = useWatch({ control, name: 'name' });

  const leave = useLeaveModalFlow('/home/add-pet');

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
