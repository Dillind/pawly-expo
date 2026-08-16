import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import EmptyState from '@/components/core/empty-state';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import ActivityDayHeader from '@/components/ui/activity-day-header';
import FeedLogRow from '@/components/ui/feed-log-row';
import { BottomTabInset, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useFeedLog } from '@/hooks/queries/feeding/use-feed-log';
import { useFeedLogs } from '@/hooks/queries/feeding/use-feed-logs';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { usePets } from '@/hooks/queries/pet/use-pets';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
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
  const [activePetId, setActivePetId] = useState<string | undefined>(undefined);
  const { logId } = useLocalSearchParams<{ logId?: string }>();

  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHousehold();
  const { data: pets = [] } = usePets();
  const timezone = household?.timezone;

  const petIds = useMemo(() => pets.map((pet) => pet.id), [pets]);
  const petNames = useMemo(() => new Map(pets.map((pet) => [pet.id, pet.name])), [pets]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedLogs(petIds);

  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  useRefreshOnFocus(['feed-logs']);

  const sheetRef = useRef<TrueSheet | null>(null);

  const { data: deepLinkedLog } = useFeedLog(logId || undefined);

  // Mirroring the resolved query result into activeLogId here, during render,
  // rather than inside the effect below -- react-hooks flags a setState call
  // synchronous with an effect body as a cascading-render risk. Comparing
  // against activeLogId itself (React's own "adjusting state on a prop
  // change" pattern) keeps this a one-shot assignment per resolved id rather
  // than a loop, since the second render sees them equal and skips it.
  if (deepLinkedLog && deepLinkedLog.id !== activeLogId) {
    setActiveLogId(deepLinkedLog.id);
    setActivePetId(deepLinkedLog.petId);
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
      <ActivityDayHeader day={item.day} timezone={timezone} />
    ) : (
      <FeedLogRow
        log={item.log}
        petName={petNames.size > 1 ? petNames.get(item.log.petId) : undefined}
        timezone={timezone}
        onPress={() => {
          setActiveLogId(item.log.id);
          setActivePetId(item.log.petId);
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
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
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

      <FeedLogDetailSheet sheetRef={sheetRef} logId={activeLogId} petId={activePetId} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    listContent: {
      paddingHorizontal: ScreenGutter,
      paddingBottom: BottomTabInset + spacing.four
    }
  });

export default Activity;
