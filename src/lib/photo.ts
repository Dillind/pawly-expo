import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { ErrorMessage } from '@/constants/enums';
import { UserFacingError } from '@/lib/errors';

/**
 * Nobody needs a 12MP original of a labrador, and once it is in the bucket it
 * is paid for forever. 1600px is comfortably past what any card renders on a
 * 3x screen, so the resize is invisible.
 */
const MAX_EDGE = 1600;

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

/**
 * Downscale and re-encode before upload. Returns a local URI, so callers keep
 * reading it with the same `fetch(uri).arrayBuffer()` they already use.
 *
 * The SDK 52 rewrite made this API stateful: `manipulate` returns a context you
 * mutate and then `renderAsync`, rather than the old one-shot
 * `manipulateAsync`. Both the context and the rendered image hold native
 * memory, hence the explicit releases.
 *
 * Only ever shrinks. Resizing by width alone preserves the aspect ratio, so a
 * portrait taller than it is wide is handled by asking which edge is longer
 * rather than by passing both dimensions.
 */
export async function resizeForUpload(uri: string): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  const initial = await context.renderAsync();

  const longestEdge = Math.max(initial.width, initial.height);

  if (longestEdge > MAX_EDGE) {
    const scale = MAX_EDGE / longestEdge;

    context.resize({
      width: Math.round(initial.width * scale),
      height: Math.round(initial.height * scale)
    });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG
  });

  initial.release();
  rendered.release();

  return saved.uri;
}
