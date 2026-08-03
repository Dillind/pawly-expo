import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import {
  useAddPetPhoto,
  useDeletePetPhoto,
  useSetCoverPhoto
} from '@/hooks/queries/use-pet-photo-mutations';
import { usePetPhotos } from '@/hooks/queries/use-pet-photos';
import { useStyles } from '@/hooks/use-styles';
import { userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { PetPhoto } from '@/services/pet-photo.service';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const PHOTO_CAP = 10;

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

type ConfirmDeleteStepProps = {
  onDelete: () => void;
  isDeleting: boolean;
};

const ConfirmDeleteStep = ({ onDelete, isDeleting }: ConfirmDeleteStepProps) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.actionsStep}>
      <AppText size={16}>Delete this photo?</AppText>

      <MainButton
        text={isDeleting ? 'Removing…' : 'Delete photo'}
        variant="secondary"
        isLoading={isDeleting}
        isDisabled={isDeleting}
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
  const { mutate: addPhoto, isPending: isAdding } = useAddPetPhoto(petId);
  const { mutate: deletePhoto, isPending: isDeleting } = useDeletePetPhoto(petId);
  const { mutate: setCoverPhoto, isPending: isSettingCover } = useSetCoverPhoto(petId);

  const [selectedPhoto, setSelectedPhoto] = useState<PetPhoto | null>(null);
  const [entryStep, setEntryStep] = useState<'actions' | 'confirm-delete'>('actions');

  const photoList = photos ?? [];
  const isAtCap = photoList.length >= PHOTO_CAP;

  const openActions = (photo: PetPhoto) => {
    setSelectedPhoto(photo);
    setEntryStep('actions');
    void sheetRef.current?.present();
  };

  const openConfirmDelete = (photo: PetPhoto) => {
    setSelectedPhoto(photo);
    setEntryStep('confirm-delete');
    void sheetRef.current?.present();
  };

  const handleSetCover = () => {
    if (!selectedPhoto) return;

    setCoverPhoto(selectedPhoto.url, {
      onSuccess: () => {
        showSuccessToast(SuccessMessage.CoverPhotoUpdated);
        void sheetRef.current?.dismiss();
      },
      onError: () => {
        showErrorToast(ErrorMessage.CoverPhotoUpdateFailed);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedPhoto) return;

    deletePhoto(
      { photoId: selectedPhoto.id, photoUrl: selectedPhoto.url },
      {
        onSuccess: () => {
          showSuccessToast(SuccessMessage.PhotoDeleted);
          void sheetRef.current?.dismiss();
        },
        onError: (error) => {
          showErrorToast(userFacingMessage(error, ErrorMessage.PhotoDeleteFailed));
        }
      }
    );
  };

  const allSteps: Record<'actions' | 'confirm-delete', TrayStepDescriptor> = {
    actions: {
      id: 'actions',
      title: 'Photo',
      render: () =>
        selectedPhoto ? (
          <ActionsStep
            photo={selectedPhoto}
            onSetCover={handleSetCover}
            onDelete={handleDelete}
            isSettingCover={isSettingCover}
            isDeleting={isDeleting}
          />
        ) : null
    },
    'confirm-delete': {
      id: 'confirm-delete',
      title: 'Delete photo',
      render: () => <ConfirmDeleteStep onDelete={handleDelete} isDeleting={isDeleting} />
    }
  };

  // Tray always opens on steps[0] -- long-press jumps straight to
  // confirm-delete, a tap opens actions with confirm-delete reachable behind it.
  const steps = [
    allSteps[entryStep],
    ...Object.values(allSteps).filter((step) => step.id !== entryStep)
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}>
        {photoList.length === 0 && (
          <AppText color="textSecondary" size={14}>
            No photos yet.
          </AppText>
        )}

        {photoList.map((photo) => (
          <Pressable
            key={photo.id}
            accessibilityRole="button"
            accessibilityLabel="Photo"
            onPress={() => openActions(photo)}
            onLongPress={() => openConfirmDelete(photo)}>
            <Image
              source={photo.url}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          </Pressable>
        ))}

        <IconButton
          name="imagePlus"
          accessibilityLabel="Add a photo"
          variant="ghost"
          size={22}
          isDisabled={isAtCap || isAdding}
          isLoading={isAdding}
          onPress={() => void photoSheetRef.current?.present()}
        />
      </ScrollView>

      {isAtCap && (
        <AppText color="textSecondary" size={13}>
          {"You've reached 10 photos."}
        </AppText>
      )}

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        onPicked={(localUri) =>
          addPhoto(localUri, {
            onSuccess: () => showSuccessToast(SuccessMessage.PhotoAdded),
            onError: (error) => showErrorToast(userFacingMessage(error, ErrorMessage.PhotoAddFailed))
          })
        }
      />

      <Tray
        sheetRef={sheetRef}
        steps={steps}
        onDismiss={() => {
          setEntryStep('actions');
          setSelectedPhoto(null);
        }}
      />
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    section: {
      gap: spacing.two
    },
    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    thumbnail: {
      width: 72,
      height: 72,
      borderRadius: Radius.tile,
      backgroundColor: colors.backgroundElement
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
