import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { ErrorMessage } from '@/constants/enums';
import { UserFacingError } from '@/lib/errors';

// Past what any card renders on a 3x screen, so the resize is invisible.
const MAX_EDGE = 1600;

const BASE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8
};

const CROP_TO_SQUARE: ImagePicker.ImagePickerOptions = {
  ...BASE_OPTIONS,
  allowsEditing: true,
  aspect: [1, 1]
};

const uriFrom = (result: ImagePicker.ImagePickerResult): string | null =>
  result.canceled ? null : result.assets[0].uri;

// Deliberately does NOT request media library permission. Both platforms'
// pickers run out of process and need no grant; asking cost a full
// authorisation round trip before the picker could open.
export async function pickPhotoFromLibrary(): Promise<string | null> {
  return uriFrom(await ImagePicker.launchImageLibraryAsync(CROP_TO_SQUARE));
}

// No square crop: `allowsEditing` excludes `allowsMultipleSelection`.
export async function pickPhotosFromLibrary(selectionLimit: number): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    ...BASE_OPTIONS,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit
  });

  return result.canceled ? [] : result.assets.map((asset) => asset.uri);
}

// The camera does need permission, unlike the library picker.
export async function takePhotoWithCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) throw new UserFacingError(ErrorMessage.CameraAccessDenied);

  return uriFrom(await ImagePicker.launchCameraAsync(CROP_TO_SQUARE));
}

// The SDK 52 API is stateful: `manipulate` returns a context you mutate, then
// `renderAsync`. Both it and the rendered image hold native memory, hence the
// explicit releases.
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
