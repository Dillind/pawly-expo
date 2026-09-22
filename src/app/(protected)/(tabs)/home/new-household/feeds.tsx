import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import FlowScreen from '@/components/layout/flow-screen';
import { ErrorMessage } from '@/constants/enums';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import {
  NEW_HOUSEHOLD_STEP_COUNT,
  type NewHouseholdFormValues
} from '@/constants/schemas/new-household';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useCreateHouseholdWithPet } from '@/hooks/queries/household/use-create-household-with-pet';
import { useNewHouseholdExit } from '@/hooks/use-new-household-exit';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast } from '@/lib/toast';
import PetPhotoService from '@/services/pet-photo.service';
import { useAuthStore } from '@/stores/auth-store';
import { describeDays } from '@/utils/days';
import { optionLabel } from '@/utils/options';

const FeedTimes = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { userId } = useAuthStore();

  const { control, handleSubmit, setError } = useFormContext<NewHouseholdFormValues>();
  const { exit } = useNewHouseholdExit();
  const { fields } = useFieldArray({ control, name: 'feedTimes' });
  const petName = useWatch({ control, name: 'petName' });
  const feedTimes = useWatch({ control, name: 'feedTimes' });

  const { mutate: createHousehold, isPending: isCreating } = useCreateHouseholdWithPet();
  const [isUploading, setIsUploading] = useState(false);

  const isBusy = isCreating || isUploading;

  const create = handleSubmit(async (values) => {
    setIsUploading(true);

    let photoUrl: string | null = null;

    try {
      if (values.photoUri && userId) {
        photoUrl = await PetPhotoService.uploadCover({ userId, localUri: values.photoUri });
      }
    } catch {
      // Nothing is written yet, so the photo is the whole failure and the
      // household is still there to create once it is retried.
      showErrorToast(ErrorMessage.PhotoAddFailed);
      return;
    } finally {
      setIsUploading(false);
    }

    createHousehold(
      {
        name: values.name,
        handle: values.handle,
        isListed: values.isListed,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        petName: values.petName,
        petType: values.petType,
        sex: values.sex,
        photoUrl,
        feedTimes: values.feedTimes
      },
      {
        // Nothing was written, and the details are still in the form, so the
        // flow goes back to the one field that has to change.
        onSuccess: (result) => {
          if (result.status === 'handle_taken') {
            setError('handle', { message: 'That handle was just taken' });
            showErrorToast(ErrorMessage.HouseholdHandleTaken);
            router.dismissTo('/home/new-household');
            return;
          }

          router.replace('/home/new-household/done');
        }
      }
    );
  });

  return (
    <FlowScreen
      step={4}
      stepCount={NEW_HOUSEHOLD_STEP_COUNT}
      title={`When does ${petName || 'your pet'} eat?`}
      subtitle="Everyone sees these times, and everyone is told when someone feeds."
      closeLabel="Leave setup"
      onClose={exit}
      onBack={() => router.back()}
      footer={
        <MainButton
          text="Create household"
          isLoading={isBusy}
          isDisabled={isBusy}
          onPress={() => void create()}
        />
      }>
      <View style={styles.list}>
        {/* Watched values, not `fields`: one render after an append the two
            lengths differ, and mapping `fields` dropped the new feed. */}
        {feedTimes.map((feedTime, index) => {
          return (
            <PressableOpacity
              key={fields[index]?.id ?? index}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`Edit the ${feedTime.label} feed`}
              onPress={() => router.push(`/home/new-household/feed?index=${index}`)}>
              <View style={styles.cardBody}>
                <AppText size={16} fontWeight="bold">
                  {optionLabel(FEEDING_SCHEDULE_LABEL_OPTIONS, feedTime.label)}
                </AppText>
                <AppText size={13} color="textSecondary">
                  {dayjs(feedTime.localTime, 'HH:mm').format('h:mm A')}
                  {'  ·  '}
                  {describeDays(feedTime.daysOfWeek)}
                </AppText>
              </View>

              <Icon name="caretRight" size={IconSize.inline} color="textSecondary" />
            </PressableOpacity>
          );
        })}
      </View>

      <MainButton
        text="Add a feed time"
        variant="secondary"
        onPress={() => router.push('/home/new-household/feed')}
      />

      <AppText size={13} color="textSecondary">
        Instructions for each feed live on the Care Card. Add them later.
      </AppText>
    </FlowScreen>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    list: {
      gap: spacing.two
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    cardBody: {
      flex: 1,
      gap: 2
    }
  });

export default FeedTimes;
