import { ErrorMessage } from '@/constants/enums';
import { UserFacingError } from '@/lib/errors';
import * as ImagePicker from 'expo-image-picker';

const BASE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8
};

/** Square and modest, because a single pick ends up as an avatar. */
const CROP_TO_SQUARE: ImagePicker.ImagePickerOptions = {
  ...BASE_OPTIONS,
  allowsEditing: true,
  aspect: [1, 1]
};

const uriFrom = (result: ImagePicker.ImagePickerResult): string | null =>
  result.canceled ? null : result.assets[0].uri;

/**
 * Deliberately does NOT request media library permission first.
 *
 * On iOS the library picker is PHPickerViewController, which runs out of
 * process and needs no grant at all. Asking anyway cost a full photo-library
 * authorisation round trip before the picker could open -- that was the delay
 * -- and raised a permission dialog for access the app never actually needs.
 * Android's picker does not need it either.
 *
 * Returns null when the user backs out. Cancelling is not an error.
 */
export async function pickPhotoFromLibrary(): Promise<string | null> {
  return uriFrom(await ImagePicker.launchImageLibraryAsync(CROP_TO_SQUARE));
}

/** No square crop: `allowsEditing` is mutually exclusive with `allowsMultipleSelection`. */
export async function pickPhotosFromLibrary(selectionLimit: number): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    ...BASE_OPTIONS,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit
  });

  return result.canceled ? [] : result.assets.map((asset) => asset.uri);
}

/** The camera genuinely does need permission, unlike the library picker. */
export async function takePhotoWithCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) throw new UserFacingError(ErrorMessage.CameraAccessDenied);

  return uriFrom(await ImagePicker.launchCameraAsync(CROP_TO_SQUARE));
}
