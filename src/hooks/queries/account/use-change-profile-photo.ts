import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { UserFacingError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import UserService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth-store';

export type ChangeProfilePhotoInput = { localUri: string; previousUrl: string | null };

export function useChangeProfilePhoto() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.ProfilePhotoUpdated,
      errorMessage: ErrorMessage.ProfilePhotoUpdateFailed
    },
    mutationFn: async ({ localUri, previousUrl }: ChangeProfilePhotoInput) => {
      if (!userId) throw new UserFacingError('You need to sign in again before changing the photo');

      const avatarUrl = await UserService.uploadAvatar({ userId, localUri });
      await UserService.setAvatarUrl(userId, avatarUrl);
      await UserService.removeAvatarByPublicUrl(previousUrl);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      // The other surfaces that draw a member's avatar.
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.post.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.householdMembers.all });
    }
  });
}
