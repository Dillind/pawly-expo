import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import ToggleSwitch from '@/components/core/toggle-switch';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { petDetailsSchema, type PetDetailsFormValues } from '@/constants/schemas/pet-details';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

const sexOptions = ['male', 'female'];

const PetDetails = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { setPetDetails, petDetails } = useOnboardingStore();

  const form = useForm<PetDetailsFormValues>({
    resolver: zodResolver(petDetailsSchema),
    defaultValues: petDetails ?? {
      name: '',
      breed: '',
      sex: 'male',
      birthdate: '',
      birthdateIsApproximate: false,
      photoUri: null
    },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting }
  } = form;

  const photoUri = watch('photoUri');

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled) {
      setValue('photoUri', result.assets[0].uri);
    }
  };

  const onSubmit = handleSubmit((values) => {
    hapticLight();
    setPetDetails(values);
    router.push('/feeding-schedule');
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Add your pet"
          description="Tell us a bit about who you're caring for."
        />

        <FormProvider {...form}>
          <PressableOpacity style={styles.photoPicker} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Icon name="camera" size={24} color="textSecondary" />
              </View>
            )}
          </PressableOpacity>

          <View style={styles.form}>
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
                  testID="pet-name"
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
                  isLabelIndicated
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Labrador, mixed, not sure..."
                  returnKeyType="done"
                  testID="pet-breed"
                />
              )}
            />
            <Controller
              control={control}
              name="sex"
              render={({ field: { onChange, value } }) => (
                <DropdownPickerValidated
                  name="sex"
                  label="Sex"
                  isLabelIndicated
                  items={sexOptions}
                  value={value}
                  onChange={(next) => onChange(next as PetDetailsFormValues['sex'])}
                  getText={(item) => (item === 'male' ? 'Male' : 'Female')}
                />
              )}
            />
            <Controller
              control={control}
              name="birthdate"
              render={({ field: { onChange, value } }) => (
                <DateTimePickerValidated
                  name="birthdate"
                  label="Birthdate"
                  isLabelIndicated
                  selectedDate={value}
                  setSelectedDate={onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="birthdateIsApproximate"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Approximate date"
                  description="I'm not sure of the exact date"
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text="Next"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              onPress={() => {
                void onSubmit();
              }}
            />
          </View>
        </FormProvider>
      </ScrollView>
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
    },
    photoPicker: {
      alignSelf: 'center'
    },
    photo: {
      width: 96,
      height: 96,
      borderRadius: 48
    },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElement
    },
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default PetDetails;
