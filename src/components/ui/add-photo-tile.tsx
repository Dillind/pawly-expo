import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type CommonProps = {
  isBusy?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
};

/**
 * The two shapes are mutually exclusive, so the union enforces it rather than a
 * comment: a square tile is sized by its caller, a dropzone fills its parent.
 */
type Props = CommonProps &
  (
    | { isDropzone?: false; size: number }
    /** Full-width dashed target, standing in for the strip when there are no photos. */
    | { isDropzone: true; size?: never }
  );

const AddPhotoTile = ({
  size,
  isDropzone = false,
  isBusy = false,
  accessibilityLabel = 'Add a photo',
  onPress
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      style={isDropzone && styles.dropzoneWrapper}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={isBusy}
      onPress={onPress}>
      <View style={[styles.tile, isDropzone ? styles.dropzone : { width: size, height: size }]}>
        {isBusy ? (
          <ActivityIndicator />
        ) : (
          <>
            <Icon name="imagePlus" size={22} color="textSecondary" />
            {isDropzone && (
              <AppText size={16} color="textSecondary">
                Add a photo
              </AppText>
            )}
          </>
        )}
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    tile: {
      flexDirection: 'row',
      gap: spacing.two,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    dropzoneWrapper: {
      alignSelf: 'stretch'
    },
    dropzone: {
      width: '100%',
      height: 110,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: 'transparent'
    }
  });

export default AddPhotoTile;
