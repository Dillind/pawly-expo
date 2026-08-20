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
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import useAddPetStore, { type AgeMode } from '@/stores/add-pet-store';
import { optionLabel } from '@/utils/options';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useRef } from 'react';
import { ActionSheetIOS, Alert, StyleSheet, View } from 'react-native';
import { isIOS } from '@/utils/platform';

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

  const { name, petType, sex, ageMode, birthdate, breed, photoUri, setDetails, reset } =
    useAddPetStore();

  const hasWork = name.trim() !== '' || breed.trim() !== '' || photoUri !== null;

  const leave = () => {
    reset();
    router.back();
  };

  // An action sheet, not an alert: this is a choice attached to something the
  // member just did, and Apple sends that to an action sheet. Nothing has been
  // typed yet means nothing to lose, so there is no question to ask.
  const cancel = () => {
    if (!hasWork) {
      leave();
      return;
    }

    const title = `You have not added ${name.trim() || 'this pet'} yet`;

    if (isIOS) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message: 'Everything you have entered will be lost.',
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

    Alert.alert(title, 'Everything you have entered will be lost.', [
      { text: 'Keep editing', style: 'cancel', isPreferred: true },
      { text: 'Discard', style: 'destructive', onPress: leave }
    ]);
  };

  return (
    <ScreenView edges={[]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <PressableOpacity accessibilityRole="button" onPress={cancel}>
              <AppText color="primary" size={16}>
                Cancel
              </AppText>
            </PressableOpacity>
          )
        }}
      />

      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        isKeyboardAware
        contentContainerStyle={styles.content}>
        <FlowStepper current={1} count={3} />

        <View style={styles.intro}>
          <AppText variant="header" size={28}>
            Who are you caring for?
          </AppText>
          <AppText size={15} color="textSecondary">
            The basics. You can fill in the rest later.
          </AppText>
        </View>

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
          <AppText color="primary" size={15}>
            {photoUri ? 'Change photo' : 'Add a photo'}
          </AppText>
        </PressableOpacity>

        <TextInputValidated
          label="Name"
          isLabelIndicated
          value={name}
          onChangeText={(next: string) => setDetails({ name: next })}
          placeholder="Bailey"
          returnKeyType="next"
        />

        <View style={styles.field}>
          <AppText size={14} fontWeight="bold">
            Pet type
          </AppText>
          <PressableOpacity
            style={styles.picker}
            accessibilityRole="button"
            accessibilityLabel={`Pet type: ${optionLabel(PET_TYPE_OPTIONS, petType)}`}
            onPress={() => router.push('/home/add-pet/pet-type')}>
            <AppText size={16} style={styles.pickerValue}>
              {optionLabel(PET_TYPE_OPTIONS, petType)}
            </AppText>
            <Icon name="caretRight" size={16} color="textSecondary" />
          </PressableOpacity>
        </View>

        <SegmentedControl
          label="Sex"
          options={SEX_OPTIONS}
          value={sex}
          onChange={(next) => setDetails({ sex: next })}
        />

        <SegmentedControl
          label="Age"
          options={AGE_OPTIONS}
          value={ageMode}
          onChange={(next) => setDetails({ ageMode: next })}
        />

        <DateTimePickerValidated
          label={ageMode === 'birthdate' ? 'Date of birth' : 'Roughly when were they born?'}
          selectedDate={birthdate}
          setSelectedDate={(next) => setDetails({ birthdate: next })}
        />

        <TextInputValidated
          label="Breed"
          value={breed}
          onChangeText={(next: string) => setDetails({ breed: next })}
          placeholder="Labrador, mixed, not sure..."
          returnKeyType="done"
        />

        <MainButton
          text="Continue"
          isDisabled={name.trim() === ''}
          onPress={() => router.push('/home/add-pet/feeds')}
        />
      </ScreenScrollView>

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        onPicked={([uri]) => setDetails({ photoUri: uri })}
      />
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: { gap: spacing.three, paddingBottom: spacing.six },
    intro: { gap: spacing.one },
    field: { gap: spacing.two },
    photoPicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.three },
    photo: { width: 56, height: 56, borderRadius: Radius.full },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElement
    },
    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    pickerValue: { flex: 1 }
  });

export default AddPetDetails;
