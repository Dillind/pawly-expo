import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FlowStepper from '@/components/ui/flow-stepper';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import useAddPetStore from '@/stores/add-pet-store';
import { describeDays } from '@/utils/days';
import { optionLabel } from '@/utils/options';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/** Step 2. Back goes to step 1, and from there Cancel leaves. One exit. */
const AddPetFeeds = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { name, feedTimes, editFeedTime } = useAddPetStore();

  const open = (index: number) => {
    editFeedTime(index);
    router.push('/home/add-pet/feed');
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <FlowStepper current={2} count={3} />

        <View style={styles.intro}>
          <AppText variant="header" size={28}>
            When does {name || 'your pet'} eat?
          </AppText>
          <AppText size={15} color="textSecondary">
            Set the times you feed them. Change them whenever you like.
          </AppText>
        </View>

        <View style={styles.list}>
          {feedTimes.map((feedTime, index) => (
            <PressableOpacity
              key={`${feedTime.label}-${feedTime.localTime}-${index}`}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`Edit the ${feedTime.label} feed`}
              onPress={() => open(index)}>
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
          ))}
        </View>

        <MainButton text="Add a feed" variant="secondary" onPress={() => open(-1)} />

        <AppText size={13} color="textSecondary">
          Days are set per feed — they can skip dinner on Sundays and still eat breakfast.
        </AppText>

        <MainButton text="Continue" onPress={() => router.push('/home/add-pet/instructions')} />
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: { gap: spacing.three, paddingBottom: spacing.six },
    intro: { gap: spacing.one },
    list: { gap: spacing.two },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    cardBody: { flex: 1, gap: 2 }
  });

export default AddPetFeeds;
