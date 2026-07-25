import DoubleFeedSheet from '@/components/bottom-sheets/double-feed-sheet';
import FeedLogSheet from '@/components/bottom-sheets/feed-log-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import SlotRow from '@/components/ui/slot-row';
import type { AppTheme } from '@/constants/theme';
import { useLogFeed, useDeleteFeedLog } from '@/hooks/use-feed-log-mutations';
import { useHousehold } from '@/hooks/use-household';
import { memberDisplayName, useHouseholdMembers } from '@/hooks/use-household-members';
import { usePet } from '@/hooks/use-pet';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useSlotStates } from '@/hooks/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { dayjs, todayInTimezone } from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { hapticSuccess } from '@/lib/haptics';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const Home = () => {
  const styles = useStyles(makeStyles);

  const { data: household } = useHousehold();
  const { data: pet } = usePet();
  const { data: members = [] } = useHouseholdMembers();

  const timezone = household?.timezone;
  const today = timezone ? todayInTimezone(timezone) : undefined;

  const {
    data: slots,
    isLoading,
    isError,
    refetch
  } = useSlotStates(pet?.id, today, { live: true });

  useRefreshOnFocus(['slot-states', pet?.id]);

  const logFeed = useLogFeed(pet?.id);
  const deleteFeedLog = useDeleteFeedLog(pet?.id);

  const doubleFeedSheetRef = useRef<TrueSheet | null>(null);
  const feedLogSheetRef = useRef<TrueSheet | null>(null);
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);

  // The slot whose Grace Window contains now(), read from cache. A stale read
  // here costs at most a missed warning, never a wrong write.
  const currentSlot = useMemo(() => {
    if (!slots || !household) return undefined;

    const now = dayjs();

    return slots.find(
      (slot) =>
        Math.abs(now.diff(dayjs(slot.scheduledAt), 'minute')) <= household.graceWindowMinutes
    );
  }, [slots, household]);

  const performLog = useCallback(() => {
    logFeed.mutate(
      {},
      {
        onSuccess: (newLogId) => {
          void hapticSuccess();
          toast.success(`${pet?.name ?? 'Your pet'} fed`, {
            action: {
              label: 'Undo',
              onClick: () => deleteFeedLog.mutate({ logId: newLogId })
            },
            cancel: {
              label: 'Add note',
              onClick: () => {
                setActiveLogId(newLogId);
                void feedLogSheetRef.current?.present();
              }
            }
          });
        },
        onError: (error) => {
          toast.error(feedLogErrorMessage(error));
        }
      }
    );
  }, [logFeed, deleteFeedLog, pet?.name]);

  const onLogPress = () => {
    if (currentSlot?.satisfyingLogId) {
      void doubleFeedSheetRef.current?.present();
      return;
    }

    performLog();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="header" size={32}>
          {pet?.name ?? ' '}
        </AppText>

        <AppText size={16} color="textSecondary">
          Today
        </AppText>

        {isError ? (
          <ErrorState
            onRetry={() => {
              void refetch();
            }}
          />
        ) : isLoading || !timezone ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.slots}>
            {slots?.map((slot) => (
              <SlotRow
                key={slot.scheduleId}
                slot={slot}
                timezone={timezone}
                fedBy={memberDisplayName(members, slot.satisfiedBy)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <MainButton
          text="Log a feed"
          isLoading={logFeed.isPending}
          isDisabled={logFeed.isPending || !pet}
          onPress={onLogPress}
        />
      </View>

      <DoubleFeedSheet
        sheetRef={doubleFeedSheetRef}
        petName={pet?.name ?? 'your pet'}
        onConfirm={performLog}
      />
      <FeedLogSheet sheetRef={feedLogSheetRef} logId={activeLogId} petId={pet?.id} />
    </SafeAreaView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
    },
    slots: {
      gap: spacing.two
    },
    actions: {
      paddingHorizontal: spacing.four,
      paddingBottom: spacing.four
    }
  });

export default Home;
