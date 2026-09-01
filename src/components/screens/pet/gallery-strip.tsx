import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import PressableOpacity from '@/components/core/pressable-opacity';
import SectionLabel from '@/components/core/section-label';
import AddPhotoTile from '@/components/ui/add-photo-tile';
import PhotoTile from '@/components/ui/photo-tile';
import type { AppTheme } from '@/constants/theme';
import { ScreenGutter, Spacing } from '@/constants/theme';
import { useAddPetPhotos, useDeletePetPhoto } from '@/hooks/queries/pet/use-pet-photo-mutations';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useRouter } from 'expo-router';
import { usePetPhotos } from '@/hooks/queries/pet/use-pet-photos';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import type { PetPhoto } from '@/services/pet-photo.service';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

const PHOTO_CAP = 10;
const TILE_SIZE = 80;
const GRID_GAP = Spacing.two;

const JIGGLE_DEGREES = 1.4;
const JIGGLE_MS = 130;
const JIGGLE_STAGGER_MS = 45;

type JigglingPhotoTileProps = {
  photo: PetPhoto;
  index: number;
  size: number;
  isEditing: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onRemove: () => void;
};

const JigglingPhotoTile = ({
  photo,
  index,
  size,
  isEditing,
  onPress,
  onLongPress,
  onRemove
}: JigglingPhotoTileProps) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!isEditing) {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 120 });
      return;
    }

    rotation.value = JIGGLE_DEGREES;
    rotation.value = withDelay(
      index * JIGGLE_STAGGER_MS,
      withRepeat(withTiming(-JIGGLE_DEGREES, { duration: JIGGLE_MS }), -1, true)
    );
  }, [isEditing, index, rotation]);

  const jiggle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View style={jiggle}>
      <PhotoTile
        uri={photo.url}
        size={size}
        onPress={onPress}
        onLongPress={onLongPress}
        onRemove={isEditing ? onRemove : undefined}
      />
    </Animated.View>
  );
};

type Props = { petId: string };

const GalleryStrip = ({ petId }: Props) => {
  const styles = useStyles(makeStyles);
  const photoSheetRef = useRef<TrueSheet | null>(null);
  const { data: photos, isLoading, isError, refetch } = usePetPhotos(petId);
  const { mutate: addPhotos, isPending: isAdding } = useAddPetPhotos(petId);
  const { mutate: deletePhoto } = useDeletePetPhoto(petId);
  const { data: household } = useHousehold();
  const router = useRouter();

  const isOwner = household?.isOwner ?? false;

  const [isEditRequested, setIsEditing] = useState(false);

  const photoList = photos ?? [];
  const remainingSlots = PHOTO_CAP - photoList.length;
  const isAtCap = remainingSlots <= 0;

  const isEditing = isOwner && isEditRequested && photoList.length > 0;

  const startEditing = () => {
    void hapticLight();
    setIsEditing(true);
  };

  const removePhoto = (photo: PetPhoto) => {
    deletePhoto({ photoId: photo.id, photoUrl: photo.url });
  };

  /** Native alert, not a sheet: delete is one tap from the badge, and a sheet fights the jiggle. */
  const confirmRemove = (photo: PetPhoto) => {
    Alert.alert('Delete this photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePhoto(photo) }
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load photos"
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  // Nothing to show and nothing to add: a heading over an empty row reads as
  // something that failed to load.
  if (!isOwner && photoList.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionLabel
        action={
          isEditing ? (
            <PressableOpacity
              accessibilityRole="button"
              accessibilityLabel="Done editing photos"
              hitSlop={12}
              onPress={() => setIsEditing(false)}>
              <AppText color="primaryText" size={15}>
                Done
              </AppText>
            </PressableOpacity>
          ) : undefined
        }
        isHeading>
        Photos
      </SectionLabel>

      {/* Horizontal rather than wrapped: the strip runs off the edge of the
          screen, which is what says there is more of it than fits. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}>
        {/* Hidden at the cap: there is nothing an 11th tile could do. */}
        {isOwner && !isAtCap && (
          <AddPhotoTile
            size={TILE_SIZE}
            isBusy={isAdding}
            onPress={() => void photoSheetRef.current?.present()}
          />
        )}

        {photoList.map((photo, index) => (
          <JigglingPhotoTile
            key={photo.id}
            photo={photo}
            index={index}
            size={TILE_SIZE}
            isEditing={isEditing}
            onPress={() =>
              isEditing ? setIsEditing(false) : router.push(`/home/${petId}/photo/${photo.id}`)
            }
            onLongPress={isOwner ? startEditing : undefined}
            onRemove={() => confirmRemove(photo)}
          />
        ))}
      </ScrollView>

      {isOwner && isAtCap && !isEditing && (
        <AppText color="textSecondary" size={13}>
          {`${PHOTO_CAP} of ${PHOTO_CAP} photos. Remove one to add another.`}
        </AppText>
      )}

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        selectionLimit={remainingSlots}
        onPicked={addPhotos}
      />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    section: {
      gap: spacing.two
    },
    // Escapes the screen gutter its parent applied, then re-indents its own
    // content -- so the first tile lines up and the last runs off the edge.
    strip: {
      marginHorizontal: -ScreenGutter
    },
    stripContent: {
      flexDirection: 'row',
      gap: GRID_GAP,
      paddingHorizontal: ScreenGutter
    }
  });

export default GalleryStrip;
