import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import FlowScreen from '@/components/layout/flow-screen';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import { ADD_PET_STEP_COUNT, type AddPetFormValues } from '@/constants/schemas/add-pet';
import { Radius, type AppTheme } from '@/constants/theme';
import { useAddPetExit } from '@/hooks/use-add-pet-exit';
import { useStyles } from '@/hooks/use-styles';
import { describeDays } from '@/utils/days';
import { optionLabel } from '@/utils/options';

const AddPetFeeds = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { control } = useFormContext<AddPetFormValues>();
  const { exit } = useAddPetExit();
  // The array is a form field, so the editor screen edits it through the same
  // form rather than through a store beside it.
  const { fields } = useFieldArray({ control, name: 'feedTimes' });
  const name = useWatch({ control, name: 'name' });
  const feedTimes = useWatch({ control, name: 'feedTimes' });

  return (
    <FlowScreen
      step={2}
      stepCount={ADD_PET_STEP_COUNT}
      title={`When does ${name || 'your pet'} eat?`}
      subtitle="Set the times you feed them. Change them whenever you like."
      closeLabel="Close, and do not add this pet"
      onClose={exit}
      onBack={() => router.back()}
      footer={
        <MainButton text="Continue" onPress={() => router.push('/home/add-pet/instructions')} />
      }>
      <View style={styles.list}>
        {fields.map((field, index) => {
          const feedTime = feedTimes[index];

          if (!feedTime) return null;

          return (
            <PressableOpacity
              key={field.id}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`Edit the ${feedTime.label} feed`}
              onPress={() => router.push(`/home/add-pet/feed?index=${index}`)}>
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

              <Icon name="caretRight" size={16} color="textSecondary" />
            </PressableOpacity>
          );
        })}
      </View>

      <MainButton
        text="Add a feed"
        variant="secondary"
        onPress={() => router.push('/home/add-pet/feed')}
      />

      <AppText size={13} color="textSecondary">
        Days are set per feed — they can skip dinner on Sundays and still eat breakfast.
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

export default AddPetFeeds;
