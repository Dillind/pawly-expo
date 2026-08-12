import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import TagPetsSheet from '@/components/bottom-sheets/tag-pets-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import AddPhotoTile from '@/components/ui/add-photo-tile';
import PhotoTile from '@/components/ui/photo-tile';
import {
  CAPTION_MAX,
  PHOTO_CAP,
  type PostFormValues,
  type PostPhotoValue
} from '@/constants/schemas/post';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

const TILE_SIZE = 88;

type Props = {
  pets: Pet[];
  /**
   * Names who the post is for. Only the create route passes it -- "Posting to"
   * is a promise about something that has not happened yet, so editing a post
   * that is already up must not say it.
   */
  householdName?: string | null;
};

const PostComposer = ({ pets, householdName }: Props) => {
  const styles = useStyles(makeStyles);
  const tagSheetRef = useRef<TrueSheet | null>(null);
  const photoSheetRef = useRef<TrueSheet | null>(null);

  const { control, setValue } = useFormContext<PostFormValues>();
  const photos = useWatch({ control, name: 'photos' });
  const petIds = useWatch({ control, name: 'petIds' });

  const remainingSlots = PHOTO_CAP - photos.length;
  const isAtCap = remainingSlots <= 0;

  const setPhotos = (next: PostPhotoValue[]) =>
    setValue('photos', next, { shouldValidate: true, shouldDirty: true });

  const addPhotos = (uris: string[]) =>
    setPhotos([
      ...photos,
      ...uris.slice(0, remainingSlots).map((uri) => ({ kind: 'new' as const, uri }))
    ]);

  const removeAt = (index: number) => setPhotos(photos.filter((_, at) => at !== index));

  /**
   * Only a photo already on the Post gets the alert. Nothing is deleted until
   * Save, but that one is gone for good then, and it cannot be picked again
   * from the library the way a just-added one can.
   */
  const confirmRemove = (photo: PostPhotoValue, index: number) => {
    if (photo.kind === 'new') {
      removeAt(index);
      return;
    }

    Alert.alert('Remove this photo?', 'It comes off the post when you save.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Remove', style: 'destructive', onPress: () => removeAt(index) }
    ]);
  };

  const togglePet = (petId: string) =>
    setValue(
      'petIds',
      petIds.includes(petId) ? petIds.filter((id) => id !== petId) : [...petIds, petId],
      { shouldDirty: true }
    );

  const taggedNames = pets
    .filter((pet) => petIds.includes(pet.id))
    .map((pet) => pet.name)
    .join(', ');

  return (
    <>
      <View style={styles.content}>
        {householdName && (
          <AppText size={14} color="textSecondary">
            Posting to {householdName}
          </AppText>
        )}

        {photos.length === 0 ? (
          <AddPhotoTile isDropzone onPress={() => void photoSheetRef.current?.present()} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}>
            {!isAtCap && (
              <AddPhotoTile
                size={TILE_SIZE}
                onPress={() => void photoSheetRef.current?.present()}
              />
            )}

            {photos.map((photo, index) => (
              <PhotoTile
                key={photo.kind === 'existing' ? photo.storagePath : photo.uri}
                uri={photo.uri}
                size={TILE_SIZE}
                accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
                onRemove={() => confirmRemove(photo, index)}
              />
            ))}
          </ScrollView>
        )}

        <AppText size={13} color="textSecondary">
          {isAtCap
            ? `${PHOTO_CAP} of ${PHOTO_CAP} photos. Remove one to add another.`
            : `${photos.length} of ${PHOTO_CAP} photos`}
        </AppText>

        <Controller
          control={control}
          name="caption"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="caption"
              label="Description"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Add a description to your post"
              isMultiline
              maxLength={CAPTION_MAX}
              showCharacterCount
              height={110}
            />
          )}
        />

        <PressableOpacity
          style={styles.row}
          onPress={() => void tagSheetRef.current?.present()}
          accessibilityRole="button"
          accessibilityLabel="Tag pets"
          disabled={pets.length === 0}>
          <Icon name="pawPrint" size={20} color="textSecondary" />
          <AppText size={16} style={styles.rowLabel}>
            Tag pets
          </AppText>
          <AppText size={15} color="textSecondary" numberOfLines={1} style={styles.rowValue}>
            {taggedNames || 'None'}
          </AppText>
          <Icon name="caretRight" size={18} color="textSecondary" />
        </PressableOpacity>
      </View>

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        selectionLimit={remainingSlots}
        onPicked={addPhotos}
      />

      <TagPetsSheet
        sheetRef={tagSheetRef}
        pets={pets}
        selectedPetIds={petIds}
        onToggle={togglePet}
        onDone={() => void tagSheetRef.current?.dismiss()}
      />
    </>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.six,
      gap: spacing.three
    },
    strip: {
      marginHorizontal: -ScreenGutter
    },
    stripContent: {
      paddingHorizontal: ScreenGutter,
      // The remove badge overhangs the tile by a quarter of its size, and a
      // clipped badge on the first and last tiles is what you get without this.
      paddingVertical: spacing.two,
      gap: spacing.two
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.three,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    rowLabel: {
      flex: 1
    },
    rowValue: {
      flexShrink: 1,
      maxWidth: '50%',
      textAlign: 'right'
    }
  });

export default PostComposer;
