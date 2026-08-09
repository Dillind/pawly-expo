import TagPetsSheet from '@/components/bottom-sheets/tag-pets-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import { CAPTION_MAX, type PostFormValues } from '@/constants/schemas/post';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { userFacingMessage } from '@/lib/errors';
import { pickPhotoFromLibrary, takePhotoWithCamera } from '@/lib/photo';
import { showErrorToast } from '@/lib/toast';
import type { Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { ActionSheetIOS, Platform, ScrollView, StyleSheet, View } from 'react-native';

type Props = {
  pets: Pet[];
};

/**
 * The composer body. The route owns the header, the save and the discard
 * guard; this owns the fields and nothing else, so the same form could be
 * reused if a post ever gets an edit screen.
 */
const PostComposer = ({ pets }: Props) => {
  const styles = useStyles(makeStyles);
  const tagSheetRef = useRef<TrueSheet | null>(null);

  const { control, setValue } = useFormContext<PostFormValues>();
  const localUri = useWatch({ control, name: 'localUri' });
  const petIds = useWatch({ control, name: 'petIds' });

  const [isPicking, setIsPicking] = useState(false);

  const setPhoto = async (pick: () => Promise<string | null>) => {
    if (isPicking) return;
    setIsPicking(true);

    try {
      const uri = await pick();
      // Null means the user backed out of the picker. Cancelling is not an
      // error and must not clear a photo they already chose.
      if (uri) setValue('localUri', uri, { shouldValidate: true, shouldDirty: true });
    } catch (error) {
      console.error(error);
      showErrorToast(userFacingMessage(error, 'Could not open the photo picker'));
    } finally {
      setIsPicking(false);
    }
  };

  /**
   * Library or camera, offered as an action sheet rather than two buttons.
   * Apple's guidance sends "choices related to an intentional action" here, and
   * the intentional action is "add a photo" -- the source is a detail of it.
   */
  const choosePhotoSource = () => {
    if (Platform.OS !== 'ios') {
      void setPhoto(pickPhotoFromLibrary);
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Take a photo', 'Choose from library'],
        cancelButtonIndex: 0
      },
      (index) => {
        if (index === 1) void setPhoto(takePhotoWithCamera);
        if (index === 2) void setPhoto(pickPhotoFromLibrary);
      }
    );
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <PressableOpacity
          style={styles.photoSlot}
          onPress={choosePhotoSource}
          accessibilityRole="button"
          accessibilityLabel={localUri ? 'Change the photo' : 'Add a photo'}>
          {localUri ? (
            <Image source={{ uri: localUri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Icon name="imagePlus" size={32} color="textSecondary" />
              <AppText size={15} color="textSecondary">
                Add a photo
              </AppText>
              <AppText size={13} color="textSecondary">
                Square — you frame it when you pick
              </AppText>
            </View>
          )}
        </PressableOpacity>

        <Controller
          control={control}
          name="caption"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="caption"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Say something about this photo… (optional)"
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
      </ScrollView>

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
    scroll: {
      flex: 1
    },
    content: {
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.six,
      gap: spacing.three
    },
    photoSlot: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: Radius.card,
      overflow: 'hidden',
      backgroundColor: colors.backgroundElement
    },
    photo: {
      width: '100%',
      height: '100%'
    },
    placeholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.one
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.three,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.backgroundSelected
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
