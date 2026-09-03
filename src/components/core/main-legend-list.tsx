import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
  type LegendListRenderItemProps
} from '@legendapp/list/react-native';
import type { ReactElement, ReactNode, Ref } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import ErrorState from '@/components/core/error-state';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';

export type MainLegendListProps<T> = Omit<
  LegendListProps<T>,
  'data' | 'renderItem' | 'ListFooterComponent'
> & {
  data: readonly T[] | null | undefined;
  renderItem: (props: LegendListRenderItemProps<T>) => ReactNode;
  ref?: Ref<LegendListRef>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorTitle?: string;
  onRetry?: () => void;
  isRefreshing?: boolean;
  ListFooterComponent?: ReactElement | null;
};

const MainLegendList = <T,>({
  data,
  renderItem,
  ref,
  keyExtractor,
  onLoadMore,
  isLoadingMore = false,
  isLoading = false,
  isError = false,
  errorTitle,
  onRetry,
  onRefresh,
  isRefreshing = false,
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
        <ErrorState title={errorTitle} onRetry={onRetry} />
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
      onEndReached={onLoadMore ? () => !isLoadingMore && onLoadMore() : undefined}
      onEndReachedThreshold={onEndReachedThreshold}
      onRefresh={onRefresh}
      refreshing={onRefresh ? isRefreshing : undefined}
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
