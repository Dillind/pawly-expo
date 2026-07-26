import ErrorState from '@/components/core/error-state';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
  type LegendListRenderItemProps
} from '@legendapp/list/react-native';
import type { ReactElement, ReactNode, Ref } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export type MainLegendListProps<T> = Omit<
  LegendListProps<T>,
  'data' | 'renderItem' | 'ListFooterComponent'
> & {
  data: readonly T[] | null | undefined;
  renderItem: (props: LegendListRenderItemProps<T>) => ReactNode;
  ref?: Ref<LegendListRef>;
  /** Paged fetch. Wired to `onEndReached`; ignored while `isLoadingMore` is true. */
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** First-load spinner. Renders in place of the list, so the empty state never flashes first. */
  isLoading?: boolean;
  /** Renders `ErrorState` in place of the list. Needs `onRetry` to be actionable. */
  isError?: boolean;
  onRetry?: () => void;
  /** Overrides the loading-more spinner when supplied. */
  ListFooterComponent?: ReactElement | null;
};

/**
 * The single list primitive: every vertical and horizontal list goes through
 * here so paging, pull-to-refresh, and the loading/error/empty states are
 * decided once rather than re-derived per screen.
 *
 * `recycleItems` is deliberately left at LegendList's own default of `false`.
 * Recycling reuses item component instances across rows, so any row holding
 * local state (an open swipe, an inline editor) shows another row's state when
 * reused. It is a per-list decision the call site has to opt into knowingly,
 * not something a shared wrapper should switch on for the whole app.
 *
 * Refresh uses LegendList's built-in `onRefresh`/`refreshing` props (v3), so
 * they pass straight through -- no hand-built `refreshControl` element.
 */
const MainLegendList = <T,>({
  data,
  renderItem,
  ref,
  keyExtractor,
  onLoadMore,
  isLoadingMore = false,
  isLoading = false,
  isError = false,
  onRetry,
  ListFooterComponent,
  onEndReachedThreshold = 0.5,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  ...rest
}: MainLegendListProps<T>) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  if (isError && onRetry) {
    return (
      <View style={styles.state}>
        <ErrorState onRetry={onRetry} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={theme.colors.textSecondary} />
      </View>
    );
  }

  const footer =
    ListFooterComponent !== undefined ? (
      ListFooterComponent
    ) : isLoadingMore ? (
      <ActivityIndicator style={styles.footerLoader} color={theme.colors.textSecondary} />
    ) : null;

  return (
    <LegendList<T>
      ref={ref}
      data={data ?? []}
      renderItem={renderItem}
      keyExtractor={
        keyExtractor ??
        ((item: T, index: number) => String((item as { id?: string | number })?.id ?? index))
      }
      // Guarded here rather than at every call site: LegendList fires
      // onEndReached again on each settle near the end, so an unguarded
      // handler requests the same page repeatedly while the first is in flight.
      onEndReached={onLoadMore ? () => !isLoadingMore && onLoadMore() : undefined}
      onEndReachedThreshold={onEndReachedThreshold}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      ListFooterComponent={footer}
      {...rest}
    />
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    state: {
      flex: 1,
      justifyContent: 'center'
    },
    footerLoader: {
      marginVertical: spacing.four
    }
  });

export default MainLegendList;
