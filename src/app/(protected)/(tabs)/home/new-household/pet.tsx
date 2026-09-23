import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import FormTextInput from '@/components/core/form-text-input';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import SegmentedControl from '@/components/core/segmented-control';
import FlowScreen from '@/components/layout/flow-screen';
import { PET_TYPE_OPTIONS, SEX_OPTIONS } from '@/constants/options';
import {
  NEW_HOUSEHOLD_PET_FIELDS,
  NEW_HOUSEHOLD_STEP_COUNT,
  type NewHouseholdFormValues
} from '@/constants/schemas/new-household';
import { Radius, type AppTheme } from '@/constants/theme';
import { useNewHouseholdExit } from '@/hooks/use-new-household-exit';
import { useStyles } from '@/hooks/use-styles';

const FirstPet = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const photoSheetRef = useRef<TrueSheet | null>(null);

  const { control, setValue, trigger } = useFormContext<NewHouseholdFormValues>();
  const { exit } = useNewHouseholdExit();

  const photoUri = useWatch({ control, name: 'photoUri' });

  const onContinue = async () => {
    const isValid = await trigger([...NEW_HOUSEHOLD_PET_FIELDS]);

    if (isValid) router.push('/home/new-household/feeds');
  };

  return (
    <FlowScreen
      step={3}
      stepCount={NEW_HOUSEHOLD_STEP_COUNT}
      title="Who do you look after?"
      subtitle="A household starts with one pet. Add the rest later."
      closeLabel="Leave setup"
      onClose={exit}
      onBack={() => router.back()}
      isKeyboardAware
      footer={<MainButton text="Continue" onPress={() => void onContinue()} />}>
      <PressableOpacity
        style={styles.photoPicker}
        accessibilityRole="button"
        accessibilityLabel="Add a photo"
        onPress={() => void photoSheetRef.current?.present()}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Icon name="camera" size={26} color="textSecondary" />
          </View>
        )}
        <AppText size="footnote" color="textSecondary">
          {photoUri ? 'Change photo' : 'Add a photo'}
        </AppText>
      </PressableOpacity>

      <FormTextInput
        name="petName"
        label="Name"
        isLabelIndicated
        placeholder="Bailey"
        returnKeyType="next"
      />

      <Controller
        control={control}
        name="petType"
        render={({ field: { onChange, value } }) => (
          <SegmentedControl
            name="petType"
            label="Type"
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

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        onPicked={([uri]) => setValue('photoUri', uri, { shouldDirty: true })}
      />
    </FlowScreen>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    photoPicker: {
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.two
    },
    photo: {
      width: 96,
      height: 96,
      borderRadius: Radius.full
    },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElement,
      borderWidth: 1,
      borderColor: colors.border
    }
  });

export default FirstPet;
