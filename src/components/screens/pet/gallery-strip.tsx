import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { type PetPhoto, usePetPhotos } from '@/hooks/use-pet-photos';
import {
  useAddPetPhoto,
  useDeletePetPhoto,
  useSetCoverPhoto
} from '@/hooks/use-pet-photo-mutations';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const PHOTO_CAP = 10;

type ActionsStepProps = {
  photo: PetPhoto;
  onSetCover: () => Promise<void>;
  onDelete: () => Promise<void>;
  isSettingCover: boolean;
  isDeleting: boolean;
  error: string | null;
};

const ActionsStep = ({
  photo,
  onSetCover,
  onDelete,
  isSettingCover,
  isDeleting,
  error
}: ActionsStepProps) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.actionsStep}>
      <Image source={photo.url} style={styles.actionsPreview} contentFit="cover" transition={200} />

      <FieldError error={error ?? undefined} />

      <MainButton
        text={isSettingCover ? 'Setting…' : 'Set as cover photo'}
        isLoading={isSettingCover}
        isDisabled={isSettingCover || isDeleting}
        onPress={() => void onSetCover()}
      />
      <MainButton
        text={isDeleting ? 'Removing…' : 'Delete photo'}
        variant="text"
        isLoading={isDeleting}
        isDisabled={isSettingCover || isDeleting}
        onPress={() => void onDelete()}
      />
    </View>
  );
};

type ConfirmDeleteStepProps = {
  onDelete: () => Promise<void>;
  isDeleting: boolean;
  error: string | null;
};

const ConfirmDeleteStep = ({ onDelete, isDeleting, error }: ConfirmDeleteStepProps) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.actionsStep}>
      <AppText size={16}>Delete this photo?</AppText>

      <FieldError error={error ?? undefined} />

      <MainButton
        text={isDeleting ? 'Removing…' : 'Delete photo'}
        variant="secondary"
        isLoading={isDeleting}
        isDisabled={isDeleting}
        onPress={() => void onDelete()}
      />
    </View>
  );
};

type Props = { petId: string };

const GalleryStrip = ({ petId }: Props) => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);
  const { data: photos, isLoading, isError, refetch } = usePetPhotos(petId);
  const addPhoto = useAddPetPhoto(petId);
  const deletePhoto = useDeletePetPhoto(petId);
  const setCoverPhoto = useSetCoverPhoto(petId);

  const [selectedPhoto, setSelectedPhoto] = useState<PetPhoto | null>(null);
  const [entryStep, setEntryStep] = useState<'actions' | 'confirm-delete'>('actions');
  const [actionError, setActionError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const photoList = photos ?? [];
  const isAtCap = photoList.length >= PHOTO_CAP;

  const pickPhoto = async () => {
    setAddError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // A silent return here reads as a dead button: the user taps, nothing
    // happens, and nothing explains why.
    if (!permission.granted) {
      setAddError('Allow photo access in Settings to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled) {
      try {
        await addPhoto.mutateAsync(result.assets[0].uri);
      } catch (error) {
        setAddError(error instanceof Error ? error.message : 'Could not add the photo');
      }
    }
  };

  const openActions = (photo: PetPhoto) => {
    setSelectedPhoto(photo);
    setEntryStep('actions');
    setActionError(null);
    void sheetRef.current?.present();
  };

  const openConfirmDelete = (photo: PetPhoto) => {
    setSelectedPhoto(photo);
    setEntryStep('confirm-delete');
    setActionError(null);
    void sheetRef.current?.present();
  };

  const handleSetCover = async () => {
    if (!selectedPhoto) return;
    setActionError(null);
    try {
      await setCoverPhoto.mutateAsync(selectedPhoto.url);
      void sheetRef.current?.dismiss();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not set the cover photo');
    }
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;
    setActionError(null);
    try {
      await deletePhoto.mutateAsync({
        photoId: selectedPhoto.id,
        photoUrl: selectedPhoto.url,
        storagePath: selectedPhoto.storagePath
      });
      void sheetRef.current?.dismiss();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not delete the photo');
    }
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
            isSettingCover={setCoverPhoto.isPending}
            isDeleting={deletePhoto.isPending}
            error={actionError}
          />
        ) : null
    },
    'confirm-delete': {
      id: 'confirm-delete',
      title: 'Delete photo',
      render: () => (
        <ConfirmDeleteStep
          onDelete={handleDelete}
          isDeleting={deletePhoto.isPending}
          error={actionError}
        />
      )
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
          isDisabled={isAtCap || addPhoto.isPending}
          isLoading={addPhoto.isPending}
          onPress={() => void pickPhoto()}
        />
      </ScrollView>

      {isAtCap && (
        <AppText color="textSecondary" size={13}>
          {"You've reached 10 photos."}
        </AppText>
      )}

      <FieldError error={addError ?? undefined} />

      <Tray
        sheetRef={sheetRef}
        steps={steps}
        onDismiss={() => {
          setEntryStep('actions');
          setSelectedPhoto(null);
          setActionError(null);
        }}
      />
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    section: { gap: spacing.two },
    strip: { flexDirection: 'row', alignItems: 'center', gap: spacing.two },
    thumbnail: {
      width: 72,
      height: 72,
      borderRadius: Radius.tile,
      backgroundColor: colors.backgroundElement
    },
    actionsStep: { gap: spacing.three },
    actionsPreview: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: Radius.card,
      backgroundColor: colors.backgroundElement
    }
  });

export default GalleryStrip;
