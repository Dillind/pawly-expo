import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import AddPhotoTile from '@/components/ui/add-photo-tile';
import PhotoTile from '@/components/ui/photo-tile';
import type { AppTheme } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import {
  useAddPetPhotos,
  useDeletePetPhoto,
  useSetCoverPhoto
} from '@/hooks/queries/pet/use-pet-photo-mutations';
import { usePetPhotos } from '@/hooks/queries/pet/use-pet-photos';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import type { PetPhoto } from '@/services/pet-photo.service';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

const PHOTO_CAP = 10;
const COLUMNS = 5;
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
  onLongPress: () => void;
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

type ActionsStepProps = {
  photo: PetPhoto;
  onSetCover: () => void;
  onDelete: () => void;
  isSettingCover: boolean;
  isDeleting: boolean;
};

const ActionsStep = ({
  photo,
  onSetCover,
  onDelete,
  isSettingCover,
  isDeleting
}: ActionsStepProps) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.actionsStep}>
      <Image source={photo.url} style={styles.actionsPreview} contentFit="cover" transition={200} />

      <MainButton
        text={isSettingCover ? 'Setting…' : 'Set as cover photo'}
        isLoading={isSettingCover}
        isDisabled={isSettingCover || isDeleting}
        onPress={onSetCover}
      />
      <MainButton
        text={isDeleting ? 'Removing…' : 'Delete photo'}
        variant="text"
        isLoading={isDeleting}
        isDisabled={isSettingCover || isDeleting}
        onPress={onDelete}
      />
    </View>
  );
};

type Props = { petId: string };

const GalleryStrip = ({ petId }: Props) => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);
  const photoSheetRef = useRef<TrueSheet | null>(null);
  const { data: photos, isLoading, isError, refetch } = usePetPhotos(petId);
  const { mutate: addPhotos, isPending: isAdding } = useAddPetPhotos(petId);
  const { mutate: deletePhoto, isPending: isDeleting } = useDeletePetPhoto(petId);
  const { mutate: setCoverPhoto, isPending: isSettingCover } = useSetCoverPhoto(petId);

  const [selectedPhoto, setSelectedPhoto] = useState<PetPhoto | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [isEditRequested, setIsEditing] = useState(false);

  const photoList = photos ?? [];
  const remainingSlots = PHOTO_CAP - photoList.length;
  const isAtCap = remainingSlots <= 0;

  const isEditing = isEditRequested && photoList.length > 0;

  // Measured, not from the window: the grid sits inside padded scroll content.
  const tileSize = (gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  const startEditing = () => {
    void hapticLight();
    setIsEditing(true);
  };

  const openActions = (photo: PetPhoto) => {
    setSelectedPhoto(photo);
    void sheetRef.current?.present();
  };

  const removePhoto = (photo: PetPhoto) => {
    deletePhoto(
      { photoId: photo.id, photoUrl: photo.url },
      { onSuccess: () => void sheetRef.current?.dismiss() }
    );
  };

  /** Native alert, not a sheet: delete is one tap from the badge, and a sheet fights the jiggle. */
  const confirmRemove = (photo: PetPhoto) => {
    Alert.alert('Delete this photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePhoto(photo) }
    ]);
  };

  const handleSetCover = () => {
    if (!selectedPhoto) return;

    setCoverPhoto(selectedPhoto.url, {
      onSuccess: () => void sheetRef.current?.dismiss()
    });
  };

  const steps: TrayStepDescriptor[] = [
    {
      id: 'actions',
      title: 'Photo',
      render: () =>
        selectedPhoto ? (
          <ActionsStep
            photo={selectedPhoto}
            onSetCover={handleSetCover}
            onDelete={() => confirmRemove(selectedPhoto)}
            isSettingCover={isSettingCover}
            isDeleting={isDeleting}
          />
        ) : null
    }
  ];

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

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="header" size={17}>
          Photos
        </AppText>

        {isEditing && (
          <PressableOpacity
            accessibilityRole="button"
            accessibilityLabel="Done editing photos"
            hitSlop={12}
            onPress={() => setIsEditing(false)}>
            <AppText color="primary" size={15}>
              Done
            </AppText>
          </PressableOpacity>
        )}
      </View>

      <View style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
        {tileSize > 0 && (
          <>
            {/* Hidden at the cap: an 11th tile would strand one on a third row. */}
            {!isAtCap && (
              <AddPhotoTile
                size={tileSize}
                isBusy={isAdding}
                onPress={() => void photoSheetRef.current?.present()}
              />
            )}

            {photoList.map((photo, index) => (
              <JigglingPhotoTile
                key={photo.id}
                photo={photo}
                index={index}
                size={tileSize}
                isEditing={isEditing}
                onPress={() => (isEditing ? setIsEditing(false) : openActions(photo))}
                onLongPress={startEditing}
                onRemove={() => confirmRemove(photo)}
              />
            ))}
          </>
        )}
      </View>

      {isAtCap && !isEditing && (
        <AppText color="textSecondary" size={13}>
          {`${PHOTO_CAP} of ${PHOTO_CAP} photos. Remove one to add another.`}
        </AppText>
      )}

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        selectionLimit={remainingSlots}
        onPicked={addPhotos}
      />

      <Tray sheetRef={sheetRef} steps={steps} onDismiss={() => setSelectedPhoto(null)} />
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    section: {
      gap: spacing.two
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 24
    },
    actionsStep: {
      gap: spacing.three
    },
    actionsPreview: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: Radius.card,
      backgroundColor: colors.backgroundElement
    }
  });

export default GalleryStrip;
