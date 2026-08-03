import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast } from '@/lib/toast';
import { pickPhotoFromLibrary, takePhotoWithCamera } from '@/lib/photo';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type SourceRowProps = { icon: IconName; label: string; onPress: () => void };

const SourceRow = ({ icon, label, onPress }: SourceRowProps) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <View style={styles.row}>
        <Icon name={icon} size={22} color="text" />
        <AppText size={17}>{label}</AppText>
      </View>
    </PressableOpacity>
  );
};

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  title?: string;
  onPicked: (uri: string) => void;
};

/**
 * The one way to choose a photo. Every surface that takes an image presents
 * this, so the camera-vs-library choice looks and behaves the same everywhere.
 *
 * The sheet dismisses BEFORE the picker opens. Raising the system picker while
 * a native sheet is still up stacks two presentations, which iOS handles badly
 * -- the same reason the popover closes before a sheet is presented.
 */
const PhotoSourceSheet = ({ sheetRef, title = 'Add a photo', onPicked }: Props) => {
  const styles = useStyles(makeStyles);

  const choose = async (source: () => Promise<string | null>) => {
    await sheetRef.current?.dismiss();

    try {
      const uri = await source();
      if (uri) onPicked(uri);
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : 'Could not open the camera or photo library'
      );
    }
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']}>
      <View style={styles.header}>
        <AppText variant="header" size={22}>
          {title}
        </AppText>
        <IconButton
          name="close"
          accessibilityLabel="Close"
          variant="ghost"
          size={18}
          containerStyle={styles.close}
          onPress={() => void sheetRef.current?.dismiss()}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.rows}>
        <SourceRow
          icon="camera"
          label="Take Photo"
          onPress={() => void choose(takePhotoWithCamera)}
        />
        <SourceRow
          icon="image"
          label="Choose Image"
          onPress={() => void choose(pickPhotoFromLibrary)}
        />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    close: {
      backgroundColor: colors.backgroundSelected,
      borderRadius: Radius.full
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textSecondary,
      opacity: 0.3
    },
    rows: { gap: spacing.two },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default PhotoSourceSheet;
