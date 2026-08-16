import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import ToggleSwitch from '@/components/core/toggle-switch';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { FEEDING_SCHEDULE_LABEL_OPTIONS, SEX_OPTIONS } from '@/constants/options';
import { addPetSchema, type AddPetFormValues } from '@/constants/schemas/add-pet';
import type { AppTheme } from '@/constants/theme';
import { useAddPet } from '@/hooks/queries/pet/use-pet-mutations';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import PetPhotoService from '@/services/pet-photo.service';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

const DEFAULT_FEEDING_TIMES: AddPetFormValues['feedingTimes'] = [
  { time: '07:00', label: 'morning' },
  { time: '17:00', label: 'dinner' }
];

const AddPet = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { userId } = useAuthStore();
  const { mutate: addPet, isPending: isAdding } = useAddPet();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<AddPetFormValues>({
    resolver: zodResolver(addPetSchema),
    defaultValues: {
      name: '',
      breed: '',
      sex: 'male',
      birthdate: '',
      birthdateIsApproximate: false,
      photoUri: null,
      feedingTimes: DEFAULT_FEEDING_TIMES
    },
    mode: 'onBlur'
  });

  const { control, handleSubmit, setValue, formState } = form;

  const photoUri = useWatch({ control, name: 'photoUri' });
  const feedingTimes = useWatch({ control, name: 'feedingTimes' });
  const photoSheetRef = useRef<TrueSheet | null>(null);

  const isBusy = isAdding || isUploading;

  const onSubmit = () => {
    void handleSubmit(async (values) => {
      setIsUploading(true);

      let photoUrl: string | null = null;

      try {
        if (values.photoUri && userId) {
          photoUrl = await PetPhotoService.uploadCover({ userId, localUri: values.photoUri });
        }
      } finally {
        setIsUploading(false);
      }

      addPet(
        {
          name: values.name,
          breed: values.breed,
          sex: values.sex,
          birthdate: values.birthdate,
          birthdateIsApproximate: values.birthdateIsApproximate,
          photoUrl,
          feedingTimes: values.feedingTimes.map((feedingTime) => ({
            scheduledTime: feedingTime.time,
            label: feedingTime.label
          }))
        },
        { onSuccess: (pet) => router.replace(`/home/${pet.id}`) }
      );
    })();
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <TextDescriptionHeader
          title="Add a pet"
          description="Tell us who else you're caring for."
        />

        <FormProvider {...form}>
          <PressableOpacity
            style={styles.photoPicker}
            onPress={() => void photoSheetRef.current?.present()}>
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
                  options={SEX_OPTIONS}
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

          <AppText size={16} fontWeight="bold">
            Feeding times
          </AppText>

          <View style={styles.feedingTimesList}>
            {feedingTimes.map((_, index) => (
              <View key={index} style={styles.feedingTimeRow}>
                <View style={styles.timeInput}>
                  <Controller
                    control={control}
                    name={`feedingTimes.${index}.time`}
                    render={({ field: { onChange, value } }) => (
                      <DateTimePickerValidated
                        mode="time"
                        selectedDate={value}
                        setSelectedDate={onChange}
                      />
                    )}
                  />
                </View>
                <Controller
                  control={control}
                  name={`feedingTimes.${index}.label`}
                  render={({ field: { onChange, value } }) => (
                    <DropdownPickerValidated
                      options={FEEDING_SCHEDULE_LABEL_OPTIONS}
                      value={value}
                      onChange={onChange}
                      wrapperStyle={styles.labelDropdown}
                    />
                  )}
                />
                <PressableOpacity
                  onPress={() =>
                    setValue(
                      'feedingTimes',
                      feedingTimes.filter((_, i) => i !== index)
                    )
                  }>
                  <AppText color="error" size={20}>
                    ×
                  </AppText>
                </PressableOpacity>
              </View>
            ))}
          </View>

          <FieldError error={formState.errors.feedingTimes?.message} />

          <PressableOpacity
            style={styles.addTime}
            onPress={() =>
              setValue('feedingTimes', [...feedingTimes, { time: '12:00', label: 'custom' }])
            }>
            <AppText color="primary" size={16}>
              + Add another time
            </AppText>
          </PressableOpacity>

          <View style={styles.actions}>
            <MainButton text="Add pet" isLoading={isBusy} isDisabled={isBusy} onPress={onSubmit} />
          </View>
        </FormProvider>
      </ScreenScrollView>

      <PhotoSourceSheet sheetRef={photoSheetRef} onPicked={([uri]) => setValue('photoUri', uri)} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingVertical: spacing.four,
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
    feedingTimesList: {
      gap: spacing.two
    },
    feedingTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    timeInput: {
      flex: 1
    },
    labelDropdown: {
      flex: 1
    },
    addTime: {
      paddingVertical: spacing.one
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default AddPet;
