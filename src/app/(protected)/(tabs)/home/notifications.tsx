import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
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
import HeaderIconButton from '@/components/core/header-icon-button';
import { Stack, useRouter } from 'expo-router';
import { SectionList, type SectionListViewToken } from '@legendapp/list/section-list';
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
 * The record of what happened in this household, including what was never
 * pushed. A muted alert still leaves a row: the member asked not to be
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

  // Marked read as they are seen, but the fill stays for the session -- the
  // list must not visibly re-sort under someone who is still reading it.
  const alreadyMarked = useRef(new Set<string>());

  // useCallback, not useRef().current: React Compiler forbids reading a ref
  // during render, and the ref is only touched inside the callback body.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: SectionListViewToken<Alert, Section>[] }) => {
      const unseen = viewableItems
        .map((token) => token.item)
        .filter((alert) => alert && !alert.isRead && !alreadyMarked.current.has(alert.id))
        .map((alert) => alert.id);

      if (unseen.length === 0) return;

      // Added before the write so one scroll does not fire the same ids twice,
      // and taken back out if it fails -- otherwise a dropped request means
      // those rows can never be marked read again this session.
      unseen.forEach((id) => alreadyMarked.current.add(id));

      markRead(unseen, {
        onError: () => unseen.forEach((id) => alreadyMarked.current.delete(id))
      });
    },
    [markRead]
  );

  const openSubject = useCallback(
    (alert: Alert) => {
      // A subject deleted since the alert was queued leaves nowhere to go. The
      // row stays read rather than routing into a screen with nothing on it.
      if (alert.kind === 'feed_logged' && alert.feedLogId) {
        return router.push(`/home/activity?logId=${alert.feedLogId}`);
      }

      if (alert.kind === 'post' && alert.postId) return router.push('/household');
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

  // The server's count, not the cached rows. `isRead` in the list is
  // deliberately stale -- the fill has to survive being read -- so deriving the
  // button from it would leave it on screen with nothing left to mark.
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
            <AlertRow alert={item} onPress={() => openSubject(item)} />
            {/* Only a read row draws a rule. An unread row's fill already
                separates it, and drawing both looks like a mistake. */}
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
            description="Feeds, missed feeds, posts and changes to who's in your household will show up here."
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
    // Inset to the text, not the avatar, so the rule reads as belonging to the
    // sentence rather than boxing the row.
    dividerInset: {
      paddingLeft: spacing.four + 40 + spacing.three
    }
  });
