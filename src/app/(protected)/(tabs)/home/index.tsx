import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import LogFeedSheet from '@/components/bottom-sheets/log-feed-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import ActionPopover from '@/components/ui/action-popover';
import { CREATE_ACTIONS } from '@/components/ui/create-actions';
import SlotRow from '@/components/ui/slot-row';
import type { AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/use-household';
import { memberDisplayName, useHouseholdMembers } from '@/hooks/use-household-members';
import { usePet } from '@/hooks/use-pet';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useSlotStates } from '@/hooks/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { todayInTimezone } from '@/lib/dates';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

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

  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);
  const detailSheetRef = useRef<TrueSheet | null>(null);
  const logSheetRef = useRef<TrueSheet | null>(null);

  return (
    <ScreenView>
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
            {slots?.map((slot) => {
              // Captured in a const rather than read inside the closure: TS
              // cannot narrow a property access through a callback, and the
              // alternative is an `as string` cast that would outlive the
              // guard if it were ever removed.
              const logId = slot.state === 'fed' ? slot.satisfyingLogId : null;

              return (
                <SlotRow
                  key={slot.scheduleId}
                  slot={slot}
                  timezone={timezone}
                  fedBy={memberDisplayName(members, slot.satisfiedBy)}
                  onPress={
                    logId
                      ? () => {
                          setActiveLogId(logId);
                          void detailSheetRef.current?.present();
                        }
                      : undefined
                  }
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <ActionPopover
        actions={CREATE_ACTIONS}
        primaryAction={{
          label: 'Log a feed',
          isDisabled: !pet?.id,
          onPress: () => {
            void logSheetRef.current?.present();
          }
        }}
      />

      <LogFeedSheet sheetRef={logSheetRef} />

      <FeedLogDetailSheet sheetRef={detailSheetRef} logId={activeLogId} petId={pet?.id} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingVertical: spacing.four,
      gap: spacing.three
    },
    slots: {
      gap: spacing.two
    }
  });

export default Home;
