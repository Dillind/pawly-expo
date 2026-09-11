import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useRemovePet } from '@/hooks/queries/pet/use-pet-mutations';

export const useConfirmRemovePet = (petId: string, name: string) => {
  const router = useRouter();
  const { mutate: removePet, isPending: isRemoving } = useRemovePet();

  const confirmRemove = () =>
    Alert.alert(
      `Remove ${name}?`,
      `This deletes every feed logged for ${name}, their Care Card, their photos and their feeding schedule. It cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removePet(petId, { onSuccess: () => router.replace('/home') })
        }
      ]
    );

  return { confirmRemove, isRemoving };
};
