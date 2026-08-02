import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import LogFeedSheet from '@/components/bottom-sheets/log-feed-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import ActionPopover from '@/components/ui/action-popover';
import { CREATE_ACTIONS } from '@/components/ui/create-actions';
import { buildHomeTiles } from '@/components/ui/home-tiles';
import SlotRow from '@/components/ui/slot-row';
import TileGrid from '@/components/ui/tile-grid';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { memberDisplayName } from '@/utils/members';
import { useRequestNotificationPermission } from '@/hooks/use-notification-permission';
import { usePet } from '@/hooks/queries/use-pet';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useSlotStates } from '@/hooks/queries/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { formatDayAndDate, todayInTimezone } from '@/lib/dates';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
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
  const hasCheckedPermission = useRef(false);
  const requestPermission = useRequestNotificationPermission();

  // The ask lives here, not in onboarding: create_household_and_pet makes the
  // (onboarding) group unreachable, so a prompt raised there would land before
  // the schedule exists.
  useEffect(() => {
    if (!pet?.id || hasCheckedPermission.current) return;
    hasCheckedPermission.current = true;

    const maybeRequest = async () => {
      const permissions = await Notifications.getPermissionsAsync();

      if (permissions.status !== Notifications.PermissionStatus.UNDETERMINED) return;

      await requestPermission();
    };

    void maybeRequest();
  }, [pet?.id, requestPermission]);

  return (
    <ScreenView>
      <ScrollView contentContainerStyle={styles.content}>
        {timezone && (
          <AppText size={14} color="textSecondary">
            {formatDayAndDate(new Date(), timezone)}
          </AppText>
        )}

        <AppText variant="header" size={32}>
          {pet?.name ?? ' '}
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

        <TileGrid tiles={buildHomeTiles(pet?.id)} />
      </ScrollView>

      <ActionPopover
        actions={CREATE_ACTIONS}
        primaryAction={{
          label: 'Log a feed',
          icon: 'utensils',
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
      paddingTop: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.three
    },
    slots: {
      gap: spacing.two
    }
  });

export default Home;
