import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import EmptyState from '@/components/core/empty-state';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import PostCard from '@/components/ui/post-card';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import {
  useDeletePost,
  useMarkPostsSeen,
  usePosts,
  useToggleLike
} from '@/hooks/queries/posts/use-posts';
import { useCommentCounts } from '@/hooks/queries/posts/use-comments';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import type { Post } from '@/services/post.service';
import { useAuthStore } from '@/stores/auth-store';
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const PostGap = 12;

const Posts = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { userId } = useAuthStore();
  const { data: households = [] } = useHouseholds();

  const isMultiHousehold = households.length > 1;

  const householdIds = useMemo(() => households.map((household) => household.id), [households]);

  const householdById = useMemo(
    () => new Map(households.map((household) => [household.id, household])),
    [households]
  );

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
  } = usePosts(householdIds, userId ?? undefined);

  // One request for the whole loaded page rather than one per card.
  const { data: commentCounts = {} } = useCommentCounts(posts.map((post) => post.id));

  useRefreshOnFocus(['posts']);
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const { mutate: toggleLike } = useToggleLike();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: markSeen } = useMarkPostsSeen(householdIds, userId ?? undefined);

  // A string, not the array: the array is a fresh identity on every refetch.
  const scopeKey = householdIds.join(',');

  // Clearing the dot is a side effect of arriving, not of the data loading, so
  // it fires on focus rather than in an effect keyed on the query.
  useFocusEffect(
    useCallback(() => {
      if (scopeKey && userId) markSeen();
    }, [scopeKey, userId, markSeen])
  );

  const permissions = (post: Post | null) => {
    const canEdit = post !== null && post.authorId === userId;
    const isOwner = post !== null && (householdById.get(post.householdId)?.isOwner ?? false);

    return { canEdit, canDelete: canEdit || isOwner };
  };

  const renderItem = ({ item }: LegendListRenderItemProps<Post>) => {
    const { canEdit, canDelete } = permissions(item);

    const openPost = () =>
      router.push({ pathname: '/posts/[postId]', params: { postId: item.id } });

    return (
      <PostCard
        post={item}
        showActions={canEdit || canDelete}
        householdName={isMultiHousehold ? householdById.get(item.householdId)?.name : undefined}
        commentCount={commentCounts[item.id] ?? 0}
        onToggleLike={() => toggleLike({ postId: item.id, liked: item.likedByMe })}
        onOpenActions={() => {
          setActivePost(item);
          void actionsSheetRef.current?.present();
        }}
        onOpen={openPost}
        // Post Detail is the thread, so the comment icon and the caption lead to
        // the same place -- the icon just says which part you came for.
        onOpenComments={openPost}
      />
    );
  };

  return (
    <ScreenView edges={[]}>
      <MainLegendList<Post>
        contentInsetAdjustmentBehavior="automatic"
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
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        keyExtractor={(post) => post.id}
        estimatedItemSize={640}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyGutter}>
            <EmptyState
              icon="image"
              title="Nothing shared yet"
              description="Photos your household shares of your pets show up here. Handy when someone else is looking after them."
              action={<MainButton text="Share a photo" href="/posts/new-post" />}
            />
          </View>
        }
        renderItem={renderItem}
      />

      <PostActionsSheet
        sheetRef={actionsSheetRef}
        canEdit={permissions(activePost).canEdit}
        canDelete={permissions(activePost).canDelete}
        onEdit={() => {
          if (activePost) {
            router.push({
              pathname: '/posts/[postId]/edit',
              params: { postId: activePost.id }
            });
          }
        }}
        onDelete={() => {
          if (activePost) deletePost(activePost.id);
        }}
      />
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    // No gutter: PostBody re-indents its words and padding here would inset the photo.
    listContent: {
      paddingBottom: spacing.six
    },
    separator: {
      height: PostGap,
      backgroundColor: colors.postDivider
    },
    emptyGutter: {
      paddingHorizontal: ScreenGutter
    }
  });

export default Posts;
