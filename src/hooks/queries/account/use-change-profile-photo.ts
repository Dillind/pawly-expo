import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { UserFacingError, userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import UserService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type ChangeProfilePhotoInput = { localUri: string; previousUrl: string | null };

export function useChangeProfilePhoto() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: async ({ localUri, previousUrl }: ChangeProfilePhotoInput) => {
      if (!userId) throw new UserFacingError('You need to sign in again before changing the photo');

      const avatarUrl = await UserService.uploadAvatar({ userId, localUri });
      await UserService.setAvatarUrl(userId, avatarUrl);
      await UserService.removeAvatarByPublicUrl(previousUrl);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      // The other surfaces that draw a member's avatar.
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['post'] });
      void queryClient.invalidateQueries({ queryKey: ['household-members'] });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.ProfilePhotoUpdated),
    onError: (error) => {
      console.error(error);
      showErrorToast(userFacingMessage(error, ErrorMessage.ProfilePhotoUpdateFailed));
    }
  });
}
