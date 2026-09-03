import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import Divider from '@/components/core/divider';
import EmptyState from '@/components/core/empty-state';
import ListCard from '@/components/core/list-card';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import ActivityDayHeader from '@/components/ui/activity-day-header';
import ActivitySkeleton from '@/components/ui/activity-skeleton';
import FeedLogRow from '@/components/ui/feed-log-row';
import MissedFeedRow from '@/components/ui/missed-feed-row';
import { BottomTabInset, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useFeedLog } from '@/hooks/queries/feeding/use-feed-log';
import { useFeedLogs } from '@/hooks/queries/feeding/use-feed-logs';
import {
  useMissedOccurrences,
  type MissedOccurrence
} from '@/hooks/queries/feeding/use-missed-occurrences';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { usePets } from '@/hooks/queries/pet/use-pets';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import { dayInTimezone, todayInTimezone } from '@/lib/dates';
import type { FeedLog } from '@/types/core';

// The rule starts under the title rather than under the avatar, matching Pets.
const DIVIDER_INSET = 64;

type DayEntry =
  | { kind: 'log'; at: string; log: FeedLog }
  | { kind: 'missed'; at: string; missed: MissedOccurrence };

type ActivityItem =
  | { kind: 'header'; day: string; isFirst: boolean }
  | { kind: 'group'; day: string; entries: DayEntry[] };

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
  const hasSeveralPets = pets.length > 1;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedLogs(petIds);

  const logs = useMemo(() => data?.pages.flat() ?? [], [data]);

  // The days the loaded history covers. A missed feed is only ever asked for on
  // a day already on screen, so scrolling further back is what fetches more of
  // them rather than every day since the household was created.
  //
  // Today is always in the list, even with nothing logged: a household whose
  // only news today is a feed nobody logged still has news.
  const days = useMemo(() => {
    if (!timezone) return [];

    const seen: string[] = [todayInTimezone(timezone)];

    for (const log of logs) {
      // The day boundary is the household's timezone, never the device's, or a
      // travelling member sees feeds land on the wrong day.
      const day = dayInTimezone(log.loggedAt, timezone);
      if (!seen.includes(day)) seen.push(day);
    }

    return seen;
  }, [logs, timezone]);

  const { missed, labelByLogId } = useMissedOccurrences(petIds, days);

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

    const byDay = new Map<string, DayEntry[]>();
    const entriesFor = (day: string) => {
      const existing = byDay.get(day);
      if (existing) return existing;

      const created: DayEntry[] = [];
      byDay.set(day, created);

      return created;
    };

    for (const log of logs) {
      entriesFor(dayInTimezone(log.loggedAt, timezone)).push({
        kind: 'log',
        at: log.loggedAt,
        log
      });
    }

    for (const entry of missed) {
      if (!days.includes(entry.occurrence.occurrenceDate)) continue;

      entriesFor(entry.occurrence.occurrenceDate).push({
        kind: 'missed',
        at: entry.occurrence.scheduledAt,
        missed: entry
      });
    }

    const result: ActivityItem[] = [];

    for (const day of days) {
      const entries = (byDay.get(day) ?? []).sort((a, b) => b.at.localeCompare(a.at));
      // A band with nothing under it is a heading over a gap. Today earns its
      // place by holding something, like every other day.
      if (entries.length === 0) continue;

      result.push({ kind: 'header', day, isFirst: result.length === 0 });
      result.push({ kind: 'group', day, entries });
    }

    return result;
  }, [days, logs, missed, timezone]);

  const renderItem = ({ item }: LegendListRenderItemProps<ActivityItem>) => {
    if (!timezone) return null;

    if (item.kind === 'header') {
      return <ActivityDayHeader day={item.day} timezone={timezone} isFirst={item.isFirst} />;
    }

    return (
      <View style={styles.group}>
        <ListCard>
          {item.entries.map((entry, index) => (
            <Fragment key={entry.kind === 'log' ? entry.log.id : entry.missed.occurrence.seriesId}>
              {index > 0 && <Divider inset={DIVIDER_INSET} />}
              {entry.kind === 'log' ? (
                <FeedLogRow
                  log={entry.log}
                  petName={hasSeveralPets ? petNames.get(entry.log.petId) : undefined}
                  label={labelByLogId.get(entry.log.id)}
                  timezone={timezone}
                  onPress={() => {
                    setActiveLogId(entry.log.id);
                    setActivePetId(entry.log.petId);
                    void sheetRef.current?.present();
                  }}
                />
              ) : (
                <MissedFeedRow
                  occurrence={entry.missed.occurrence}
                  petName={hasSeveralPets ? petNames.get(entry.missed.petId) : undefined}
                />
              )}
            </Fragment>
          ))}
        </ListCard>
      </View>
    );
  };

  if ((isLoading || !timezone) && !isError) {
    return (
      <ScreenView edges={[]}>
        <ActivitySkeleton />
      </ScreenView>
    );
  }

  return (
    <ScreenView edges={[]}>
      <MainLegendList<ActivityItem>
        contentInsetAdjustmentBehavior="automatic"
        data={items}
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
          item.kind === 'header' ? `header-${item.day}` : `group-${item.day}`
        }
        estimatedItemSize={96}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="clipboardList"
            title="Nothing logged yet"
            description="Every feed your household logs shows up here, newest first."
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
    // No horizontal padding: the day band runs edge to edge and each group
    // re-indents itself, which is what lets a card scroll under the band.
    listContent: {
      paddingBottom: BottomTabInset + spacing.four
    },
    group: {
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.two
    }
  });

export default Activity;
