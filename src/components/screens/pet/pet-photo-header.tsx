import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const PHOTO_HEADER_HEIGHT = 164;

type Props = {
  photoUrl: string | null;
  isBusy?: boolean;
  /** Both absent for a member who cannot edit the pet. */
  onEdit?: () => void;
  onChangePhoto?: () => void;
};

/**
 * The pet's photo, full width, with the back and Edit controls floating on it.
 *
 * Glass is right here and nowhere else on this screen: the controls sit over
 * content, so the material has something to refract. Over the flat page below
 * it a GlassView renders no circle at all — see KNOWLEDGE.md.
 *
 * The native header is hidden on this screen, so the back button is drawn here.
 */
const PetPhotoHeader = ({ photoUrl, isBusy = false, onEdit, onChangePhoto }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.header}>
      {/* The photo is its own tap target for an owner. Edit beside it opens the
          pet's details, which is a different job. */}
      <PressableOpacity
        disabled={!onChangePhoto || isBusy}
        accessibilityRole={onChangePhoto ? 'button' : 'image'}
        accessibilityLabel={onChangePhoto ? 'Change photo' : undefined}
        onPress={onChangePhoto}>
        {photoUrl ? (
          <Image source={photoUrl} style={styles.photo} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.photo, styles.placeholder]}>
            <Icon name="pawPrint" size={44} color="textSecondary" />
          </View>
        )}

        {isBusy && (
          <View style={styles.busy}>
            <ActivityIndicator />
          </View>
        )}
      </PressableOpacity>

      <View style={[styles.controls, { top: insets.top + 8 }]}>
        <IconButton
          name="caretLeft"
          accessibilityLabel="Back"
          variant="glass"
          size={22}
          isOverContent
          onPress={() => router.back()}
        />

        {onEdit && (
          <MainButton text="Edit" variant="glass" size="sm" isOverContent onPress={onEdit} />
        )}
      </View>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      height: PHOTO_HEADER_HEIGHT,
      backgroundColor: colors.backgroundSelected
    },
    photo: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.backgroundSelected
    },
    placeholder: {
      alignItems: 'center',
      justifyContent: 'center'
    },
    busy: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center'
    },
    controls: {
      position: 'absolute',
      left: spacing.three,
      right: spacing.three,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  });

export default PetPhotoHeader;
