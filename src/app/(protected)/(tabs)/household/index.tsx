import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import PostCard from '@/components/ui/post-card';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import {
  useDeletePost,
  useMarkPostsSeen,
  usePosts,
  useToggleLike
} from '@/hooks/queries/use-posts';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import type { Post } from '@/services/post.service';
import { useAuthStore } from '@/stores/auth-store';
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const Household = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const householdId = household?.id;
  const isOwner = household?.isOwner ?? false;

  const [activePost, setActivePost] = useState<Post | null>(null);
  const actionsSheetRef = useRef<TrueSheet | null>(null);

  const {
    data: posts = [],
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePosts(householdId, userId ?? undefined);

  useRefreshOnFocus(['posts']);

  const { mutate: toggleLike } = useToggleLike(householdId, userId ?? undefined);
  const { mutate: deletePost } = useDeletePost(householdId);
  const { mutate: markSeen } = useMarkPostsSeen(householdId, userId ?? undefined);

  // Clearing the dot is a side effect of arriving, not of the data loading, so
  // it fires on focus rather than in an effect keyed on the query.
  useFocusEffect(
    useCallback(() => {
      if (householdId && userId) markSeen();
    }, [householdId, userId, markSeen])
  );

  const renderItem = ({ item }: LegendListRenderItemProps<Post>) => (
    <PostCard
      post={item}
      canManage={item.authorId === userId || isOwner}
      onToggleLike={() => toggleLike({ postId: item.id, liked: item.likedByMe })}
      onOpenActions={() => {
        setActivePost(item);
        void actionsSheetRef.current?.present();
      }}
    />
  );

  return (
    <ScreenView>
      <View style={styles.header}>
        <AppText variant="header" size={28} fontWeight="bold">
          Household
        </AppText>
        <IconButton
          name="plus"
          variant="glass"
          size={20}
          accessibilityLabel="Share a photo"
          onPress={() => router.push('/household/new-post')}
        />
      </View>

      <MainLegendList<Post>
        data={posts}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => {
          void refetch();
        }}
        onLoadMore={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        isLoadingMore={isFetchingNextPage}
        keyExtractor={(post) => post.id}
        estimatedItemSize={480}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="image"
            title="Nothing shared yet"
            description="Photos your household shares of your pets show up here. Handy when someone else is looking after them."
            action={
              <MainButton text="Share a photo" href="/household/new-post" />
            }
          />
        }
        renderItem={renderItem}
      />

      <PostActionsSheet
        sheetRef={actionsSheetRef}
        onDelete={() => {
          if (activePost) deletePost(activePost.id);
        }}
      />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.two
    },
    listContent: {
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.six
    }
  });

export default Household;
