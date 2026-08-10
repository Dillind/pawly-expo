import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { pickPhotoFromLibrary, pickPhotosFromLibrary, takePhotoWithCamera } from '@/lib/photo';
import { showErrorToast } from '@/lib/toast';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  title?: string;
  /** Set to open the library in multi-select. Omit for the single picker, which crops to a square. */
  selectionLimit?: number;
  onPicked: (uris: string[]) => void;
};

const PhotoSourceSheet = ({ sheetRef, title = 'Add a photo', selectionLimit, onPicked }: Props) => {
  const styles = useStyles(makeStyles);

  const choose = async (source: () => Promise<string[]>) => {
    await sheetRef.current?.dismiss();

    try {
      const uris = await source();
      if (uris.length > 0) onPicked(uris);
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : 'Could not open the camera or photo library'
      );
    }
  };

  const takePhoto = async () => {
    const uri = await takePhotoWithCamera();
    return uri ? [uri] : [];
  };

  const chooseFromLibrary = async () => {
    if (selectionLimit !== undefined) return pickPhotosFromLibrary(selectionLimit);

    const uri = await pickPhotoFromLibrary();
    return uri ? [uri] : [];
  };

  return (
    <BaseSheet sheetRef={sheetRef} title={title} detents={['auto']}>
      <View style={styles.rows}>
        <SheetRow icon="camera" label="Take Photo" onPress={() => void choose(takePhoto)} />
        <SheetRow
          icon="image"
          label={
            selectionLimit !== undefined && selectionLimit > 1 ? 'Choose Images' : 'Choose Image'
          }
          onPress={() => void choose(chooseFromLibrary)}
        />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: { gap: spacing.two }
  });

export default PhotoSourceSheet;
