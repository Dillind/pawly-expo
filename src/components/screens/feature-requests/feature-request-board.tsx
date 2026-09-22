import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';

import FeatureRequestSheet from '@/components/bottom-sheets/feature-request-sheet';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import PressableOpacity from '@/components/core/pressable-opacity';
import SegmentedControl from '@/components/core/segmented-control';
import { SkeletonBlock } from '@/components/core/skeleton';
import ScreenView from '@/components/layout/screen-view';
import FeatureRequestCard from '@/components/ui/feature-request-card';
import { FEATURE_REQUEST_SORT_OPTIONS } from '@/constants/options';
import { BottomTabInset, IconSize, type AppTheme } from '@/constants/theme';
import {
  useFeatureRequests,
  useIsBoardBanned,
  useIsCrumpetTeam
} from '@/hooks/queries/feature-requests/use-feature-requests';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import type { FeatureRequest, FeatureRequestSort } from '@/services/feature-request.service';

const SKELETON_ROWS = 4;
const SKELETON_HEIGHT = 96;

const SORT_FADE = { duration: 180, reduceMotion: ReduceMotion.System };

const FeatureRequestBoard = () => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const createRef = useRef<TrueSheet | null>(null);
  const { reported } = useLocalSearchParams<{ reported?: string }>();

  const [sort, setSort] = useState<FeatureRequestSort>('top');
  const listOpacity = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: listOpacity.get() }));

  const changeSort = (next: FeatureRequestSort) => {
    if (next === sort) return;
    listOpacity.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, SORT_FADE)));
    setSort(next);
  };

  const { data: isTeam = false } = useIsCrumpetTeam();
  const { data: isBanned = false } = useIsBoardBanned();
  const isReportedFilter = isTeam && reported === '1';

  const {
    data: requests = [],
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useFeatureRequests(sort, isReportedFilter);
  const { data: reportedRequests = [], hasNextPage: hasMoreReported } = useFeatureRequests(
    'top',
    true,
    isTeam
  );
  const reportedCount = `${reportedRequests.length}${hasMoreReported ? '+' : ''}`;
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const setReportedFilter = (isOn: boolean) =>
    router.setParams({ reported: isOn ? '1' : undefined });

  const renderItem = useCallback(
    ({ item }: LegendListRenderItemProps<FeatureRequest>) => (
      <Animated.View style={[styles.item, fadeStyle]}>
        <FeatureRequestCard
          request={item}
          isTeam={isTeam}
          isBanned={isBanned}
          isReviewing={isReportedFilter}
        />
        {item.isHidden && item.isMine ? (
          <AppText size={12} color="textSecondary" style={styles.hiddenNote}>
            Only the author and the Crumpet team see a hidden request.
          </AppText>
        ) : null}
      </Animated.View>
    ),
    [isTeam, isBanned, isReportedFilter, styles.item, styles.hiddenNote, fadeStyle]
  );

  const header = (
    <View style={styles.header}>
      <SegmentedControl
        options={FEATURE_REQUEST_SORT_OPTIONS}
        value={sort}
        onChange={changeSort}
        isThumbRaised
      />
      {isBanned ? (
        <View style={styles.banned}>
          <Icon name="lock" size={IconSize.control} color="textSecondary" />
          <AppText size={14} color="textSecondary">
            You can no longer post on this board.
          </AppText>
        </View>
      ) : null}
      {isReportedFilter ? (
        <View style={styles.filter}>
          <Icon name="flag" size={IconSize.inline} color="error" />
          <AppText size={14} fontWeight="semibold" color="error" style={styles.filterText}>
            Showing reported requests
          </AppText>
          <PressableOpacity
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setReportedFilter(false)}>
            <AppText size={14} fontWeight="semibold">
              Clear
            </AppText>
          </PressableOpacity>
        </View>
      ) : null}
      {isLoading ? (
        <View style={styles.skeleton}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <SkeletonBlock key={index} height={SKELETON_HEIGHT} radius={18} />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <ScreenView edges={[]}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="arrow.up.arrow.down" accessibilityLabel="Sort">
          {/* An empty iOS badge ignores fontSize; a space lets it size the dot. */}
          {isTeam && reportedRequests.length > 0 ? (
            <Stack.Toolbar.Badge style={{ fontSize: 4 }}> </Stack.Toolbar.Badge>
          ) : null}
          <Stack.Toolbar.Menu inline title="Sort by">
            {FEATURE_REQUEST_SORT_OPTIONS.map((option) => (
              <Stack.Toolbar.MenuAction
                key={option.value}
                isOn={sort === option.value}
                onPress={() => changeSort(option.value)}>
                {option.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu inline title="Crumpet team" hidden={!isTeam}>
            <Stack.Toolbar.MenuAction
              icon="flag"
              isOn={isReportedFilter}
              onPress={() => setReportedFilter(!isReportedFilter)}>
              {reportedRequests.length > 0 ? `Reported (${reportedCount})` : 'Reported'}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="New request"
          variant="prominent"
          tintColor={colors.primary}
          hidden={isBanned}
          onPress={() => void createRef.current?.present()}
        />
      </Stack.Toolbar>

      <MainLegendList<FeatureRequest>
        // LegendList keeps its last row when data empties, so the empty state remounts it.
        key={requests.length === 0 ? 'empty' : 'rows'}
        data={isLoading ? [] : requests}
        renderItem={renderItem}
        keyExtractor={(request) => request.id}
        extraData={`${isTeam}-${isBanned}-${isReportedFilter}`}
        isError={isError}
        errorTitle="Couldn't load feature requests"
        onRetry={() => void refetch()}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        onLoadMore={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        isLoadingMore={isFetchingNextPage}
        estimatedItemSize={112}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? null : isReportedFilter ? (
            <EmptyState icon="circleCheck" title="Nothing to review" />
          ) : (
            <EmptyState
              icon="lightbulb"
              isIconAccent
              title="No requests yet"
              description="Tell us what would make Crumpet better."
              action={
                isBanned ? undefined : (
                  <MainButton
                    text="New request"
                    onPress={() => void createRef.current?.present()}
                  />
                )
              }
            />
          )
        }
      />

      <FeatureRequestSheet sheetRef={createRef} />
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.three,
      paddingBottom: BottomTabInset + spacing.four,
      flexGrow: 1
    },
    header: {
      paddingTop: spacing.two,
      paddingBottom: spacing.three,
      gap: spacing.three
    },
    item: {
      paddingBottom: spacing.three - spacing.one
    },
    hiddenNote: {
      paddingTop: spacing.two,
      paddingHorizontal: spacing.one
    },
    banned: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two + spacing.half,
      paddingHorizontal: 14,
      paddingVertical: spacing.three - spacing.one,
      borderRadius: 14,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSelected
    },
    filter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderCurve: 'continuous',
      backgroundColor: colors.errorMuted
    },
    filterText: {
      flex: 1
    },
    skeleton: {
      gap: spacing.three - spacing.one
    }
  });

export default FeatureRequestBoard;
