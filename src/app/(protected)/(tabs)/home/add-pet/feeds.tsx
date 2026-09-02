import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenFooter from '@/components/layout/screen-footer';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FlowStepper from '@/components/ui/flow-stepper';
import { ADD_PET_STEPS } from '@/constants/schemas/add-pet';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import type { AddPetFormValues } from '@/constants/schemas/add-pet';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { describeDays } from '@/utils/days';
import { optionLabel } from '@/utils/options';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

/** Step 2. Back goes to step 1, and from there Cancel leaves. One exit. */
const AddPetFeeds = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { control } = useFormContext<AddPetFormValues>();
  // The array is a form field, so the editor screen edits it through the same
  // form rather than through a store beside it.
  const { fields } = useFieldArray({ control, name: 'feedTimes' });
  const name = useWatch({ control, name: 'name' });
  const feedTimes = useWatch({ control, name: 'feedTimes' });

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <FlowStepper current={2} steps={ADD_PET_STEPS} />

        <View style={styles.intro}>
          <AppText variant="header" size={28}>
            When does {name || 'your pet'} eat?
          </AppText>
          <AppText size={15} color="textSecondary">
            Set the times you feed them. Change them whenever you like.
          </AppText>
        </View>

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
      </ScreenScrollView>

      <ScreenFooter>
        <MainButton text="Continue" onPress={() => router.push('/home/add-pet/instructions')} />
      </ScreenFooter>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      gap: spacing.three,
      paddingBottom: spacing.four
    },
    intro: {
      gap: spacing.one
    },
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
