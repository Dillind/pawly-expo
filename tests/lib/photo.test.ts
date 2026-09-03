import * as ImagePicker from 'expo-image-picker';

import { UserFacingError } from '@/lib/errors';
import { pickPhotoFromLibrary, pickPhotosFromLibrary, takePhotoWithCamera } from '@/lib/photo';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn()
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;

beforeEach(() => jest.clearAllMocks());

describe('pickPhotoFromLibrary', () => {
  it('never asks for media library permission', async () => {
    // The whole point: PHPickerViewController needs no grant, and asking cost
    // a full authorisation round trip before the picker could open.
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await pickPhotoFromLibrary();

    expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns the chosen uri', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///chosen.jpg' }]
    } as never);

    await expect(pickPhotoFromLibrary()).resolves.toBe('file:///chosen.jpg');
  });

  it('returns null when the user backs out, rather than throwing', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await expect(pickPhotoFromLibrary()).resolves.toBeNull();
  });
});

describe('pickPhotosFromLibrary', () => {
  it('opens the picker in multi-select, capped at the limit it was given', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await pickPhotosFromLibrary(4);

    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 4 })
    );
  });

  it('never asks to crop, which the platform cannot combine with multi-select', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await pickPhotosFromLibrary(10);

    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({ allowsEditing: true })
    );
  });

  it('returns every chosen uri, in the order they were picked', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///one.jpg' }, { uri: 'file:///two.jpg' }, { uri: 'file:///three.jpg' }]
    } as never);

    await expect(pickPhotosFromLibrary(10)).resolves.toEqual([
      'file:///one.jpg',
      'file:///two.jpg',
      'file:///three.jpg'
    ]);
  });

  it('returns an empty array when the user backs out', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await expect(pickPhotosFromLibrary(10)).resolves.toEqual([]);
  });
});

describe('takePhotoWithCamera', () => {
  it('asks for camera permission, which the camera genuinely needs', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///taken.jpg' }]
    } as never);

    await expect(takePhotoWithCamera()).resolves.toBe('file:///taken.jpg');
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalled();
  });

  it('throws a message the user can act on when permission is refused', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);

    await expect(takePhotoWithCamera()).rejects.toBeInstanceOf(UserFacingError);
    await expect(takePhotoWithCamera()).rejects.toThrow('Allow camera access in Settings');
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns null when the shot is discarded', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });

    await expect(takePhotoWithCamera()).resolves.toBeNull();
  });
});
