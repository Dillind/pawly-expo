import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import SegmentedControl from '@/components/core/segmented-control';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FlowStepper from '@/components/ui/flow-stepper';
import { PET_TYPE_OPTIONS, SEX_OPTIONS } from '@/constants/options';
import {
  ADD_PET_DETAIL_FIELDS,
  ADD_PET_STEPS,
  type AddPetFormValues
} from '@/constants/schemas/add-pet';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { AgeMode } from '@/types/core';
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
  const photoUri = useWatch({ control, name: 'photoUri' });

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
              onChange={onChange}
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
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="birthdate"
          render={({ field: { onChange, value } }) => (
            <DateTimePickerValidated
              name="birthdate"
              label={ageMode === 'birthdate' ? 'Date of birth' : 'Roughly when were they born?'}
              isLabelIndicated
              selectedDate={value}
              setSelectedDate={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="breed"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="breed"
              label="Breed"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Labrador, mixed, not sure..."
              returnKeyType="done"
            />
          )}
        />

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
