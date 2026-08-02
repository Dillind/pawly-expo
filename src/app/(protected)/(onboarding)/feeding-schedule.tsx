import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import {
  feedingScheduleSchema,
  type FeedingScheduleFormValues
} from '@/constants/schemas/feeding-schedule';
import { FEEDING_SCHEDULE_LABEL_OPTIONS, TIMEZONE_OPTIONS } from '@/constants/options';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import OnboardingService from '@/services/onboarding.service';
import PetPhotoService from '@/services/pet-photo.service';
import { useAuthStore } from '@/stores/auth-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

const FeedingSchedule = () => {
  const styles = useStyles(makeStyles);
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { petDetails, timezone, feedingTimes, setSchedule, resetOnboarding } = useOnboardingStore();

  const form = useForm<FeedingScheduleFormValues>({
    resolver: zodResolver(feedingScheduleSchema),
    defaultValues: { timezone, feedingTimes },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting }
  } = form;

  const watchedFeedingTimes = useWatch({ control, name: 'feedingTimes' });

  const addFeedingTime = () => {
    setValue('feedingTimes', [...watchedFeedingTimes, { time: '15:00', label: 'custom' }]);
  };

  const removeFeedingTime = (index: number) => {
    setValue(
      'feedingTimes',
      watchedFeedingTimes.filter((_, i) => i !== index)
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!petDetails || !userId) {
      showErrorToast(ErrorMessage.MissingPetDetails);
      return;
    }

    setSchedule(values);

    try {
      const photoUrl = petDetails.photoUri
        ? await PetPhotoService.uploadCover({ userId, localUri: petDetails.photoUri })
        : null;

      await OnboardingService.createHouseholdAndPet({
        timezone: values.timezone,
        pet: {
          name: petDetails.name,
          breed: petDetails.breed,
          sex: petDetails.sex,
          birthdate: petDetails.birthdate,
          birthdateIsApproximate: petDetails.birthdateIsApproximate,
          photoUrl
        },
        feedingTimes: values.feedingTimes.map((feedingTime) => ({
          scheduledTime: feedingTime.time,
          label: feedingTime.label
        }))
      });

      resetOnboarding();
      queryClient.invalidateQueries({ queryKey: ['has-household', userId] });
      showSuccessToast(SuccessMessage.OnboardingCompleted);
    } catch (error) {
      showErrorToast(ErrorMessage.OnboardingFailed, error instanceof Error ? error.message : 'Try again');
    }
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Feeding schedule"
          description="Set the times you'll feed your pet each day."
        />

        <FormProvider {...form}>
          <Controller
            control={control}
            name="timezone"
            render={({ field: { onChange, value } }) => (
              <DropdownPickerValidated
                name="timezone"
                label="Timezone"
                options={TIMEZONE_OPTIONS}
                value={value}
                onChange={onChange}
              />
            )}
          />

          <View style={styles.feedingTimesList}>
            {watchedFeedingTimes.map((feedingTime, index) => (
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
                <PressableOpacity onPress={() => removeFeedingTime(index)}>
                  <AppText color="error" size={20}>
                    ×
                  </AppText>
                </PressableOpacity>
              </View>
            ))}
          </View>

          <FieldError error={form.formState.errors.feedingTimes?.message} />

          <PressableOpacity onPress={addFeedingTime} style={styles.addTime}>
            <AppText color="primary" size={16}>
              + Add another time
            </AppText>
          </PressableOpacity>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Finishing up…' : 'Finish'}
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

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
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

export default FeedingSchedule;
