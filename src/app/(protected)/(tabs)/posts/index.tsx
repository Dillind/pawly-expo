import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import PostsFilterSheet from '@/components/bottom-sheets/posts-filter-sheet';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import PostCard from '@/components/ui/post-card';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useFollowing } from '@/hooks/queries/follow/use-follows';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import {
  useDeletePost,
  useMarkPostsSeen,
  usePosts,
  useToggleLike
} from '@/hooks/queries/posts/use-posts';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import type { Post } from '@/services/post.service';
import { useAuthStore } from '@/stores/auth-store';
import usePostsScopeStore from '@/stores/posts-scope-store';
import { countDigits } from '@/utils/counts';

const PostGap = 12;

const Posts = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { userId } = useAuthStore();
  const { data: households = [] } = useHouseholds();
  const { data: following = [] } = useFollowing();

  const { scope, setScope, isFilterRequested, clearFilterRequest } = usePostsScopeStore();

  const memberIds = useMemo(() => households.map((household) => household.id), [households]);

  const followedIds = useMemo(
    () =>
      following.filter((entry) => entry.status === 'accepted').map((entry) => entry.householdId),
    [following]
  );

  // Both sets, in one lookup. A followed household has no membership row, so
  // it carries no `isOwner` -- which is correct: a follower moderates nothing.
  const householdById = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; isOwner: boolean }>();

    for (const entry of following) {
      byId.set(entry.householdId, { id: entry.householdId, name: entry.name, isOwner: false });
    }

    for (const household of households) {
      byId.set(household.id, {
        id: household.id,
        name: household.name,
        isOwner: household.isOwner
      });
    }

    return byId;
  }, [households, following]);

  const householdIds = useMemo(() => {
    if (scope.kind === 'mine') return memberIds;
    if (scope.kind === 'following') return followedIds;
    if (scope.kind === 'household') return [scope.householdId];

    return [...memberIds, ...followedIds];
  }, [scope, memberIds, followedIds]);

  // The household name on a card answers "whose pet is this?", which only
  // needs asking once more than one household is in the stream.
  const isMultiHousehold = memberIds.length + followedIds.length > 1;

  const [activePost, setActivePost] = useState<Post | null>(null);
  const actionsSheetRef = useRef<TrueSheet | null>(null);
  const filterSheetRef = useRef<TrueSheet | null>(null);

  // The bar button lives in the layout, so the request crosses through the
  // store rather than through a prop that has nowhere to travel.
  useEffect(() => {
    if (!isFilterRequested) return;

    void filterSheetRef.current?.present();
    clearFilterRequest();
  }, [isFilterRequested, clearFilterRequest]);

  const {
    data: posts = [],
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePosts(householdIds, userId ?? undefined);

  useRefreshOnFocus(['posts']);
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const { mutate: toggleLike } = useToggleLike();
  const { mutate: deletePost } = useDeletePost();
  // Member households only: markSeen writes to household_members, and a
  // followed household has no membership row for it to match.
  const { mutate: markSeen } = useMarkPostsSeen(memberIds, userId ?? undefined);

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

    const openComments = () =>
      router.push({ pathname: '/posts/[postId]/comments', params: { postId: item.id } });

    return (
      <PostCard
        post={item}
        showActions={canEdit || canDelete}
        householdName={isMultiHousehold ? householdById.get(item.householdId)?.name : undefined}
        commentCount={item.commentCount}
        onToggleLike={() => toggleLike({ postId: item.id, liked: item.likedByMe })}
        onOpenActions={() => {
          setActivePost(item);
          void actionsSheetRef.current?.present();
        }}
        onOpen={openPost}
        onOpenComments={openComments}
      />
    );
  };

  const scopeText = () => {
    if (scope.kind === 'mine') return 'My households';
    if (scope.kind === 'following') {
      return `Following · ${countDigits(followedIds.length, 'household')}`;
    }
    if (scope.kind === 'household') {
      return householdById.get(scope.householdId)?.name ?? 'One household';
    }

    return null;
  };

  const scopeLine = scopeText();

  const filterHouseholds = [...householdById.values()].map((household) => ({
    id: household.id,
    name: household.name,
    isFollowed: followedIds.includes(household.id)
  }));

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
        ListHeaderComponent={
          scopeLine ? (
            <View style={styles.scope}>
              <AppText size={13} color="textSecondary">
                {scopeLine}
              </AppText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyGutter}>
            <EmptyState
              icon="image"
              title="No posts yet"
              description="Photos your household shares of your pets show up here. Handy when someone else is looking after them."
              action={<MainButton text="Share a photo" href="/posts/new-post" />}
            />
          </View>
        }
        renderItem={renderItem}
      />

      <PostsFilterSheet
        sheetRef={filterSheetRef}
        scope={scope}
        households={filterHouseholds}
        hasFollowed={followedIds.length > 0}
        onSelect={setScope}
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
    },
    scope: {
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.two
    }
  });

export default Posts;
