import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import EmptyState from '@/components/core/empty-state';
import HeaderIconButton from '@/components/core/header-icon-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import AlertRow from '@/components/screens/notifications/alert-row';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import {
  useAlerts,
  useMarkAlertsRead,
  useMarkAllAlertsRead,
  useRefreshUnreadAlertCount,
  useUnreadAlertCount
} from '@/hooks/queries/use-alerts';
import { useHousehold } from '@/hooks/queries/use-household';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useStyles } from '@/hooks/use-styles';
import { collapseLikes, type InboxRow } from '@/lib/alert-groups';
import type {
  LegendListRenderItemProps,
  OnViewableItemsChangedInfo
} from '@legendapp/list/react-native';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

export default function Notifications() {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHousehold();
  const householdId = household?.id;
  const timezone = household?.timezone ?? 'Australia/Brisbane';

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAlerts(householdId);

  const refreshUnread = useRefreshUnreadAlertCount(householdId);
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch, refreshUnread]);
  const { mutate: markRead } = useMarkAlertsRead(householdId);
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllAlertsRead(householdId);
  const { data: unreadCount = 0 } = useUnreadAlertCount(householdId);

  const alerts = useMemo(() => collapseLikes(data?.pages.flat() ?? []), [data]);

  const alreadyMarked = useRef(new Set<string>());

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: OnViewableItemsChangedInfo<InboxRow>) => {
      const unseen = viewableItems
        .map((token) => token.item)
        .filter((row) => !row.isRead)
        .flatMap((row) => row.alertIds)
        .filter((id) => !alreadyMarked.current.has(id));

      if (unseen.length === 0) return;

      unseen.forEach((id) => alreadyMarked.current.add(id));

      markRead(unseen, {
        onError: () => unseen.forEach((id) => alreadyMarked.current.delete(id))
      });
    },
    [markRead]
  );

  const openSubject = useCallback(
    (alert: InboxRow) => {
      if ((alert.kind === 'post' || alert.kind === 'post_liked') && alert.postId) {
        return router.push('/household');
      }

      if (alert.kind === 'missed_feed' && alert.petId) return router.push('/home');
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }: LegendListRenderItemProps<InboxRow>) => (
      <>
        <AlertRow alert={item} timezone={timezone} onPress={() => openSubject(item)} />
        {item.isRead && index < alerts.length - 1 && (
          <View style={styles.dividerInset}>
            <Divider />
          </View>
        )}
      </>
    ),
    [timezone, openSubject, alerts.length, styles.dividerInset]
  );

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

      <MainLegendList<InboxRow>
        data={alerts}
        renderItem={renderItem}
        keyExtractor={(alert) => alert.id}
        isLoading={isLoading}
        isError={isError}
        errorTitle="Couldn't load notifications"
        onRetry={() => void refetch()}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        onLoadMore={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        showsVerticalScrollIndicator
        isLoadingMore={isFetchingNextPage}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        ListHeaderComponent={
          alerts.length > 0 ? (
            <View style={styles.sectionHeader}>
              <AppText size={12} color="textSecondary" fontWeight="bold">
                THIS WEEK
              </AppText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="bell"
            title="You're all caught up"
            description="Posts, likes, missed feeds and changes to who's in your household show up here for seven days."
          />
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
