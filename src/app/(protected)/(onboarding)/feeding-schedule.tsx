import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import {
  feedingScheduleSchema,
  type FeedingScheduleFormValues
} from '@/constants/schemas/feeding-schedule';
import type { AppTheme } from '@/constants/theme';
import { COMMON_TIMEZONES } from '@/constants/timezones';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { supabase } from '@/lib/supabase/client';
import StorageService from '@/services/storage.service';
import { useAuthStore } from '@/stores/auth-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

const timezoneItems = COMMON_TIMEZONES.includes(
  Intl.DateTimeFormat().resolvedOptions().timeZone as (typeof COMMON_TIMEZONES)[number]
)
  ? [...COMMON_TIMEZONES]
  : [Intl.DateTimeFormat().resolvedOptions().timeZone, ...COMMON_TIMEZONES];

const labelOptions = ['morning', 'lunch', 'dinner', 'custom'];

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
      toast.error('Something went wrong', {
        description: 'Missing pet details, go back and try again'
      });
      return;
    }

    setSchedule(values);

    try {
      const photoUrl = petDetails.photoUri
        ? await StorageService.uploadPetPhoto({ userId, localUri: petDetails.photoUri })
        : null;

      const { error } = await supabase.rpc('create_household_and_pet', {
        household_timezone: values.timezone,
        pet_name: petDetails.name,
        pet_breed: petDetails.breed,
        pet_sex: petDetails.sex,
        pet_birthdate: petDetails.birthdate,
        pet_birthdate_is_approximate: petDetails.birthdateIsApproximate,
        pet_photo_url: photoUrl,
        feeding_times: values.feedingTimes.map((feedingTime) => ({
          scheduledTime: feedingTime.time,
          label: feedingTime.label
        }))
      });

      if (error) throw error;

      resetOnboarding();
      queryClient.invalidateQueries({ queryKey: ['has-household', userId] });
      toast.success('Pet profile completed successfully');
    } catch (error) {
      toast.error('Could not finish setup', {
        description: error instanceof Error ? error.message : 'Try again'
      });
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
                items={timezoneItems}
                value={value}
                onChange={onChange}
                getText={(item) => item.replace(/_/g, ' ')}
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
                      items={labelOptions}
                      value={value}
                      onChange={(next) =>
                        onChange(next as FeedingScheduleFormValues['feedingTimes'][number]['label'])
                      }
                      getText={(item) => item.charAt(0).toUpperCase() + item.slice(1)}
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
