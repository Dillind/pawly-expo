import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import LogFeedSheet from '@/components/bottom-sheets/log-feed-sheet';
import EmptyState from '@/components/core/empty-state';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import ActionPopover from '@/components/ui/action-popover';
import ActivityDayHeader from '@/components/ui/activity-day-header';
import { CREATE_ACTIONS } from '@/components/ui/create-actions';
import FeedLogRow from '@/components/ui/feed-log-row';
import type { AppTheme } from '@/constants/theme';
import { useFeedLog } from '@/hooks/use-feed-log';
import { useFeedLogs } from '@/hooks/use-feed-logs';
import { useHousehold } from '@/hooks/use-household';
import { usePet } from '@/hooks/use-pet';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import { dayInTimezone } from '@/lib/dates';
import type { FeedLog } from '@/types/core';
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

type ActivityItem = { kind: 'header'; day: string } | { kind: 'log'; log: FeedLog };

const Activity = () => {
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);
  const { logId } = useLocalSearchParams<{ logId?: string }>();

  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHousehold();
  const { data: pet } = usePet();
  const timezone = household?.timezone;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedLogs(pet?.id);

  useRefreshOnFocus(['feed-logs', pet?.id]);

  const sheetRef = useRef<TrueSheet | null>(null);
  const logSheetRef = useRef<TrueSheet | null>(null);

  const { data: deepLinkedLog } = useFeedLog(logId || undefined);

  // Mirroring the resolved query result into activeLogId here, during render,
  // rather than inside the effect below -- react-hooks flags a setState call
  // synchronous with an effect body as a cascading-render risk. Comparing
  // against activeLogId itself (React's own "adjusting state on a prop
  // change" pattern) keeps this a one-shot assignment per resolved id rather
  // than a loop, since the second render sees them equal and skips it.
  if (deepLinkedLog && deepLinkedLog.id !== activeLogId) {
    setActiveLogId(deepLinkedLog.id);
  }

  useEffect(() => {
    if (!logId || !deepLinkedLog) return;

    void sheetRef.current?.present();
    // Clearing the param immediately means back-navigation and a second tap on
    // the same notification both behave.
    router.setParams({ logId: '' });
  }, [logId, deepLinkedLog, router]);

  const items = useMemo<ActivityItem[]>(() => {
    if (!timezone) return [];

    const logs = data?.pages.flat() ?? [];
    const result: ActivityItem[] = [];
    let currentDay: string | null = null;

    for (const log of logs) {
      // The day boundary is the household's timezone, never the device's, or a
      // travelling member sees feeds land on the wrong day.
      const day = dayInTimezone(log.loggedAt, timezone);

      if (day !== currentDay) {
        currentDay = day;
        result.push({ kind: 'header', day });
      }

      result.push({ kind: 'log', log });
    }

    return result;
  }, [data, timezone]);

  const renderItem = ({ item }: LegendListRenderItemProps<ActivityItem>) => {
    if (!timezone) return null;

    return item.kind === 'header' ? (
      <ActivityDayHeader day={item.day} petId={pet?.id} timezone={timezone} />
    ) : (
      <FeedLogRow
        log={item.log}
        timezone={timezone}
        onPress={() => {
          setActiveLogId(item.log.id);
          void sheetRef.current?.present();
        }}
      />
    );
  };

  return (
    <ScreenView>
      <MainLegendList<ActivityItem>
        data={items}
        isLoading={isLoading || !timezone}
        isError={isError}
        onRetry={() => {
          void refetch();
        }}
        onLoadMore={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        isLoadingMore={isFetchingNextPage}
        keyExtractor={(item) =>
          item.kind === 'header' ? `header-${item.day}` : `log-${item.log.id}`
        }
        estimatedItemSize={72}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="utensils"
            title="No feeds logged yet"
            description="Log the first feed and it'll show up here for everyone in the household."
            action={<MainButton text="Log a feed" href="/home" />}
          />
        }
        renderItem={renderItem}
      />

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

      <FeedLogDetailSheet sheetRef={sheetRef} logId={activeLogId} petId={pet?.id} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    listContent: {
      paddingBottom: spacing.six
    }
  });

export default Activity;
