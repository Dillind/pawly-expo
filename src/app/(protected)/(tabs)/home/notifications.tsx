import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import HeaderIconButton from '@/components/core/header-icon-button';
import ScreenView from '@/components/layout/screen-view';
import AlertRow from '@/components/screens/notifications/alert-row';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import {
  useAlerts,
  useMarkAlertsRead,
  useMarkAllAlertsRead,
  useUnreadAlertCount
} from '@/hooks/queries/use-alerts';
import { useHousehold } from '@/hooks/queries/use-household';
import { useStyles } from '@/hooks/use-styles';
import { compareDayBuckets, dayBucket, type DayBucket } from '@/lib/dates';
import type { Alert } from '@/services/alert.service';
import { SectionList, type SectionListViewToken } from '@legendapp/list/section-list';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type Section = { title: DayBucket; data: Alert[] };

const groupByDay = (alerts: Alert[], timezone: string): Section[] => {
  const buckets = new Map<DayBucket, Alert[]>();

  for (const alert of alerts) {
    const bucket = dayBucket(alert.createdAt, timezone);
    const existing = buckets.get(bucket);

    if (existing) existing.push(alert);
    else buckets.set(bucket, [alert]);
  }

  return [...buckets.entries()]
    .map(([title, data]) => ({ title, data }))
    .sort((a, b) => compareDayBuckets(a.title, b.title));
};

/**
 * A muted alert still leaves a row here: the member asked not to be
 * interrupted, not to be kept in the dark.
 */
export default function Notifications() {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHousehold();
  const householdId = household?.id;
  const timezone = household?.timezone ?? 'Australia/Brisbane';

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAlerts(householdId);
  const { mutate: markRead } = useMarkAlertsRead(householdId);
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllAlertsRead(householdId);
  const { data: unreadCount = 0 } = useUnreadAlertCount(householdId);

  const alerts = useMemo(() => data?.pages.flat() ?? [], [data]);
  const sections = useMemo(() => groupByDay(alerts, timezone), [alerts, timezone]);

  const alreadyMarked = useRef(new Set<string>());

  // useCallback, not useRef().current: React Compiler forbids reading a ref
  // during render.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: SectionListViewToken<Alert, Section>[] }) => {
      const unseen = viewableItems
        .map((token) => token.item)
        .filter((alert) => alert && !alert.isRead && !alreadyMarked.current.has(alert.id))
        .map((alert) => alert.id);

      if (unseen.length === 0) return;

      // Added before the write so one scroll cannot fire the same ids twice,
      // and taken back out on failure so a dropped request can be retried.
      unseen.forEach((id) => alreadyMarked.current.add(id));

      markRead(unseen, {
        onError: () => unseen.forEach((id) => alreadyMarked.current.delete(id))
      });
    },
    [markRead]
  );

  const openSubject = useCallback(
    (alert: Alert) => {
      // A deleted subject leaves nowhere to go, so the row does nothing.
      if (alert.kind === 'feed_logged' && alert.feedLogId) {
        return router.push(`/home/activity?logId=${alert.feedLogId}`);
      }

      if ((alert.kind === 'post' || alert.kind === 'post_liked') && alert.postId) {
        return router.push('/household');
      }

      if (alert.kind === 'missed_feed' && alert.petId) return router.push('/home');
    },
    [router]
  );

  if (isLoading) {
    return (
      <ScreenView>
        <ActivityIndicator style={styles.loading} />
      </ScreenView>
    );
  }

  if (isError) {
    return (
      <ScreenView>
        <ErrorState title="Couldn't load notifications" onRetry={() => void refetch()} />
      </ScreenView>
    );
  }

  const hasUnread = unreadCount > 0;

  return (
    <ScreenView edges={[]}>
      <Stack.Screen
        options={{
          headerRight: hasUnread
            ? () => (
                <HeaderIconButton
                  name="check"
                  accessibilityLabel="Mark all as read"
                  isDisabled={isMarkingAll}
                  onPress={() => markAllRead()}
                />
              )
            : undefined
        }}
      />

      <SectionList<Alert, Section>
        sections={sections}
        keyExtractor={(alert) => alert.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <AppText size={12} color="textSecondary" fontWeight="bold">
              {section.title.toUpperCase()}
            </AppText>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <>
            <AlertRow alert={item} timezone={timezone} onPress={() => openSubject(item)} />
            {item.isRead && index < section.data.length - 1 && (
              <View style={styles.dividerInset}>
                <Divider />
              </View>
            )}
          </>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bell"
            title="Nothing yet"
            description="Feeds, missed feeds, posts, likes and changes to who's in your household will show up here."
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator style={styles.loading} /> : null
        }
      />
    </ScreenView>
  );
}

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingBottom: BottomTabInset + spacing.four,
      flexGrow: 1
    },
    loading: { paddingVertical: spacing.five },
    sectionHeader: {
      paddingHorizontal: spacing.four,
      paddingTop: spacing.four,
      paddingBottom: spacing.two,
      backgroundColor: colors.background
    },
    dividerInset: {
      paddingLeft: spacing.four + 40 + spacing.three
    }
  });
