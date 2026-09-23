import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { UserFacingError, userFacingMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import PetPhotoService from '@/services/pet-photo.service';
import PetService from '@/services/pet.service';
import { useAuthStore } from '@/stores/auth-store';

export type ChangePetPhotoInput = { localUri: string; previousUrl: string | null };

const invalidateCover = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.petDetail(petId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.households.all });
};

// Sequential: `add_pet_photo` derives `sort_order` from existing rows, so concurrent calls
// race.
export function useAddPetPhotos(petId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: async (localUris: string[]) => {
      if (!userId) throw new UserFacingError('You need to sign in again before adding a photo');

      for (const localUri of localUris) {
        await PetPhotoService.add({ petId, userId, localUri });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.petPhotos(petId) });
    },
    onSuccess: (_data, localUris) => {
      showSuccessToast(
        localUris.length === 1 ? SuccessMessage.PhotoAdded : SuccessMessage.PhotosAdded
      );
    },
    onError: (error, localUris) => {
      showErrorToast(
        userFacingMessage(
          error,
          localUris.length === 1 ? ErrorMessage.PhotoAddFailed : ErrorMessage.PhotosAddFailed
        )
      );
    }
  });
}

export function useDeletePetPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.PhotoDeleted,
      errorMessage: ErrorMessage.PhotoDeleteFailed
    },
    mutationFn: (data: { photoId: string; photoUrl: string }) => PetPhotoService.remove(data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.petPhotos(petId) });
      invalidateCover(queryClient, petId);
    }
  });
}

// Replaces the pet's profile photo. This writes `pets.photo_url` only — the cover is a single
// image, deliberately not a gallery row, which is the same shape onboarding sets it in.
export function useChangePetPhoto(petId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.PetPhotoUpdated,
      errorMessage: ErrorMessage.PetPhotoUpdateFailed
    },
    mutationFn: async ({ localUri, previousUrl }: ChangePetPhotoInput) => {
      if (!userId) throw new UserFacingError('You need to sign in again before changing the photo');

      const publicUrl = await PetPhotoService.uploadCover({ userId, localUri });
      await PetService.setPhotoUrl(petId, publicUrl);
      await PetPhotoService.removeByPublicUrl(previousUrl);
    },
    onSettled: () => invalidateCover(queryClient, petId)
  });
}
