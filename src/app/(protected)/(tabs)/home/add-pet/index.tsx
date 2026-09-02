import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AgePickerValidated from '@/components/core/age-picker-validated';
import AppText from '@/components/core/app-text';
import BreedField from '@/components/core/breed-field';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import SegmentedControl from '@/components/core/segmented-control';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FlowStepper from '@/components/ui/flow-stepper';
import { breedName, breedSpeciesFor } from '@/constants/breeds';
import { PET_TYPE_OPTIONS, SEX_OPTIONS } from '@/constants/options';
import {
  ADD_PET_DETAIL_FIELDS,
  ADD_PET_STEPS,
  type AddPetFormValues
} from '@/constants/schemas/add-pet';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { AgeMode } from '@/types/core';
import { birthdateFromAge } from '@/lib/dates';
import { isIOS } from '@/utils/platform';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { ActionSheetIOS, Alert, StyleSheet, View } from 'react-native';

const AGE_OPTIONS: { value: AgeMode; label: string }[] = [
  { value: 'birthdate', label: 'Date of birth' },
  { value: 'approximate', label: 'Approximate age' }
];

/**
 * Step 1, and the only step with Cancel. From here on there is a Back button,
 * and two controls that both look like leaving is the thing this avoids.
 */
const AddPetDetails = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const photoSheetRef = useRef<TrueSheet | null>(null);

  const { control, setValue, trigger, reset } = useFormContext<AddPetFormValues>();

  // useFormState, not formState off useFormContext. The form lives in the
  // layout, and its formState Proxy only computes what the LAYOUT's render
  // reads — so isDirty stayed false forever here and Cancel discarded a
  // half-entered pet with no confirmation. useFormState subscribes this
  // component properly, and re-rendering it is also what keeps headerLeft's
  // closure from going stale.
  const { isDirty } = useFormState({ control });

  const petName = useWatch({ control, name: 'name' });
  const ageMode = useWatch({ control, name: 'ageMode' });
  const birthdate = useWatch({ control, name: 'birthdate' });
  const photoUri = useWatch({ control, name: 'photoUri' });
  const petType = useWatch({ control, name: 'petType' });
  const breedId = useWatch({ control, name: 'breedId' });

  const breedSpecies = breedSpeciesFor(petType);

  const leave = () => {
    reset();
    router.back();
  };

  // An action sheet, not an alert: this is a choice attached to something the
  // member just did, and Apple sends that to an action sheet. Nothing typed
  // means nothing to lose, so there is no question to ask.
  const cancel = () => {
    if (!isDirty) {
      leave();
      return;
    }

    const title = `You have not added ${petName.trim() || 'this pet'} yet`;
    const message = 'Everything you have entered will be lost.';

    if (isIOS) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: ['Keep editing', 'Discard'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1
        },
        (index) => {
          if (index === 1) leave();
        }
      );
      return;
    }

    Alert.alert(title, message, [
      { text: 'Keep editing', style: 'cancel', isPreferred: true },
      { text: 'Discard', style: 'destructive', onPress: leave }
    ]);
  };

  // The gate is the schema, not a hand-written condition: validate exactly the
  // fields this step owns, and let each input render its own error.
  const onContinue = async () => {
    const isValid = await trigger([...ADD_PET_DETAIL_FIELDS]);

    if (isValid) router.push('/home/add-pet/feeds');
  };

  return (
    <ScreenView edges={[]}>
      {/* Cancel reads `isDirty` from this screen, so the toolbar lives here
          rather than in the layout. A React view in the bar hands its geometry
          to the next screen's back button and stretches it. */}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={cancel}>Cancel</Stack.Toolbar.Button>
      </Stack.Toolbar>

      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        isKeyboardAware
        contentContainerStyle={styles.content}>
        <FlowStepper current={1} steps={ADD_PET_STEPS} />

        <View style={styles.intro}>
          <AppText variant="header" size={28}>
            Who are you caring for?
          </AppText>
          <AppText size={15} color="textSecondary">
            The basics. You can fill in the rest later.
          </AppText>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="name"
              label="Name"
              isLabelIndicated
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Bailey"
              returnKeyType="next"
            />
          )}
        />

        <PressableOpacity
          style={styles.photoPicker}
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          onPress={() => void photoSheetRef.current?.present()}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Icon name="camera" size={24} color="textSecondary" />
            </View>
          )}
          <View style={styles.photoHint}>
            <AppText color="primaryText" size={15} fontWeight="semibold">
              {photoUri ? 'Change photo' : 'Add a photo'}
            </AppText>
            <AppText color="textSecondary" size={13}>
              Optional
            </AppText>
          </View>
        </PressableOpacity>

        <Controller
          control={control}
          name="petType"
          render={({ field: { onChange, value } }) => (
            <SegmentedControl
              name="petType"
              label="Pet type"
              options={PET_TYPE_OPTIONS}
              value={value}
              onChange={(next) => {
                onChange(next);
                // A dog breed is not a cat breed, and `other` has no list at
                // all. Changing the type clears a value that no longer applies.
                if (breedSpeciesFor(next) !== breedSpecies) {
                  setValue('breedId', null, { shouldDirty: true });
                }
              }}
            />
          )}
        />

        <Controller
          control={control}
          name="sex"
          render={({ field: { onChange, value } }) => (
            <SegmentedControl
              name="sex"
              label="Sex"
              options={SEX_OPTIONS}
              value={value}
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="ageMode"
          render={({ field: { onChange, value } }) => (
            <SegmentedControl
              name="ageMode"
              label="Age"
              options={AGE_OPTIONS}
              value={value}
              onChange={(next) => {
                onChange(next);
                // The wheels always read something, so an empty birthdate would
                // leave the caption disagreeing with what is on screen.
                if (next === 'approximate' && !birthdate) {
                  setValue('birthdate', birthdateFromAge({ years: 0, months: 0 }), {
                    shouldDirty: true
                  });
                }
              }}
            />
          )}
        />

        <Controller
          control={control}
          name="birthdate"
          render={({ field: { onChange, value } }) =>
            ageMode === 'birthdate' ? (
              <DateTimePickerValidated
                name="birthdate"
                label="Date of birth"
                isLabelIndicated
                selectedDate={value}
                setSelectedDate={onChange}
              />
            ) : (
              <AgePickerValidated
                name="birthdate"
                label="How old are they?"
                isLabelIndicated
                selectedDate={value}
                setSelectedDate={onChange}
              />
            )
          }
        />

        {/* No breed field for `other`: we hold no breed list for a rabbit or
            a bird. */}
        {breedSpecies && (
          <BreedField
            value={breedName(breedId) ?? null}
            description={
              breedSpecies === 'dog'
                ? 'Dog breeds. Change the pet type and this list changes with it.'
                : 'Cat breeds. Change the pet type and this list changes with it.'
            }
            onPress={() => router.push('/home/add-pet/breed')}
          />
        )}

        <MainButton text="Continue" onPress={() => void onContinue()} />
      </ScreenScrollView>

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        onPicked={([uri]) => setValue('photoUri', uri, { shouldDirty: true })}
      />
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: { gap: spacing.three, paddingBottom: spacing.six },
    intro: { gap: spacing.one },
    photoPicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.three },
    photo: { width: 56, height: 56, borderRadius: Radius.full },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElement
    },
    photoHint: { gap: 2 }
  });

export default AddPetDetails;
