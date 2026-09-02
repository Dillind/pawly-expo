import OccasionTray from '@/components/bottom-sheets/occasion-tray';
import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import TagPetsSheet from '@/components/bottom-sheets/tag-pets-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import AddPhotoTile from '@/components/ui/add-photo-tile';
import OccasionEmoji from '@/components/ui/occasion-emoji';
import PhotoTile from '@/components/ui/photo-tile';
import {
  CAPTION_MAX,
  PHOTO_CAP,
  TITLE_MAX,
  type PostFormValues,
  type PostPhotoValue
} from '@/constants/schemas/post';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useOccasions } from '@/hooks/queries/posts/use-occasions';
import { useStyles } from '@/hooks/use-styles';
import type { PostOccasion } from '@/services/post.service';
import type { Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

const TILE_SIZE = 88;

type Props = {
  pets: Pet[];
  householdName?: string | null;
  /** Whose Occasions the picker offers. The set belongs to the Household. */
  householdId?: string;
  /**
   * What the Post already carries. A removed Occasion is gone from the picker
   * but not from the Post, so without this the row reads as unset and the
   * member has nothing to tap to clear it.
   */
  currentOccasion?: PostOccasion | null;
};

const PostComposer = ({ pets, householdName, householdId, currentOccasion }: Props) => {
  const styles = useStyles(makeStyles);
  const tagSheetRef = useRef<TrueSheet | null>(null);
  const photoSheetRef = useRef<TrueSheet | null>(null);
  const occasionTrayRef = useRef<TrueSheet | null>(null);

  const { control, setValue } = useFormContext<PostFormValues>();
  const photos = useWatch({
    control,
    name: 'photos'
  });
  const petIds = useWatch({
    control,
    name: 'petIds'
  });
  const occasionId = useWatch({
    control,
    name: 'occasionId'
  });

  const { data: occasions = [] } = useOccasions(householdId);
  const occasion =
    occasions.find((entry) => entry.id === occasionId) ??
    (currentOccasion && currentOccasion.id === occasionId ? currentOccasion : null);

  const title = useWatch({
    control,
    name: 'title'
  });
  const firstTaggedPet = pets.find((pet) => petIds.includes(pet.id)) ?? null;

  const remainingSlots = PHOTO_CAP - photos.length;
  const isAtCap = remainingSlots <= 0;

  const setPhotos = (next: PostPhotoValue[]) =>
    setValue('photos', next, {
      shouldValidate: true,
      shouldDirty: true
    });

  const addPhotos = (uris: string[]) =>
    setPhotos([
      ...photos,
      ...uris.slice(0, remainingSlots).map((uri) => ({
        kind: 'new' as const,
        uri
      }))
    ]);

  const removeAt = (index: number) => setPhotos(photos.filter((_, at) => at !== index));

  const confirmRemove = (photo: PostPhotoValue, index: number) => {
    if (photo.kind === 'new') {
      removeAt(index);
      return;
    }

    Alert.alert('Remove this photo?', 'It comes off the post when you save.', [
      {
        text: 'Cancel',
        style: 'cancel',
        isPreferred: true
      },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeAt(index)
      }
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
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="title"
              label="Title"
              isLabelIndicated
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Name your post"
              maxLength={TITLE_MAX}
              showCharacterCount
            />
          )}
        />

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

        <View style={styles.photos}>
          <AppText size={16}>Photos</AppText>

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
        </View>

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

        <PressableOpacity
          style={styles.occasionRow}
          onPress={() => void occasionTrayRef.current?.present()}
          accessibilityRole="button"
          accessibilityLabel="Choose an occasion"
          disabled={!householdId}>
          <Icon name="sparkles" size={20} color="textSecondary" />
          <AppText size={16} style={styles.rowLabel}>
            Occasion
          </AppText>

          {occasion ? (
            <View style={styles.occasionValue}>
              {occasion.emoji && <OccasionEmoji emoji={occasion.emoji} size={20} />}
              {occasion.label && (
                <AppText size={15} color="textSecondary" numberOfLines={1}>
                  {occasion.label}
                </AppText>
              )}
            </View>
          ) : (
            <AppText size={15} color="textSecondary" numberOfLines={1} style={styles.rowValue}>
              What&rsquo;s the occasion?
            </AppText>
          )}

          <Icon name="caretRight" size={18} color="textSecondary" />
        </PressableOpacity>
      </View>

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        selectionLimit={remainingSlots}
        onPicked={addPhotos}
      />

      <OccasionTray
        sheetRef={occasionTrayRef}
        householdId={householdId}
        selectedId={occasionId}
        selectedOccasion={occasion}
        preview={{
          title,
          pet: firstTaggedPet && {
            name: firstTaggedPet.name,
            photoUrl: firstTaggedPet.photoUrl
          }
        }}
        onSelect={(next) => setValue('occasionId', next, { shouldDirty: true })}
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
      paddingTop: spacing.three,
      paddingBottom: spacing.six,
      gap: spacing.three
    },
    photos: {
      gap: spacing.one
    },
    strip: {
      marginHorizontal: -ScreenGutter
    },
    stripContent: {
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.two,
      gap: spacing.two
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.three,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    occasionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.three,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    occasionValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      flexShrink: 1,
      maxWidth: '50%',
      justifyContent: 'flex-end'
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
