import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import PostCard from '@/components/ui/post-card';
import PostFilterBar, { ALL_HOUSEHOLDS, type PostScope } from '@/components/ui/post-filter-bar';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
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
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const Posts = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { userId } = useAuthStore();
  const { data: households = [] } = useHouseholds();

  // Not persisted: the scope is where you are looking right now, and a filter
  // surviving a relaunch hides posts from someone who has forgotten they set it.
  const [chosenScope, setScope] = useState<PostScope>(ALL_HOUSEHOLDS);
  const isMultiHousehold = households.length > 1;

  // Healed rather than stored: leaving the household you had filtered to would
  // otherwise leave a dead id selected, no chips on screen to change it, and an
  // empty tab until the next relaunch.
  const scope =
    chosenScope !== ALL_HOUSEHOLDS && !households.some((household) => household.id === chosenScope)
      ? ALL_HOUSEHOLDS
      : chosenScope;

  const householdIds = useMemo(() => {
    const ids = households.map((household) => household.id);

    return scope === ALL_HOUSEHOLDS ? ids : ids.filter((id) => id === scope);
  }, [households, scope]);

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

  useRefreshOnFocus(['posts']);
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const { mutate: toggleLike } = useToggleLike();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: markSeen } = useMarkPostsSeen(householdIds, userId ?? undefined);

  // Keyed on a string, not the array: `householdIds` has a fresh identity on
  // every households refetch, and the effect would issue a write for each one.
  const scopeKey = householdIds.join(',');

  // Clearing the dot is a side effect of arriving, not of the data loading, so
  // it fires on focus rather than in an effect keyed on the query.
  useFocusEffect(
    useCallback(() => {
      if (scopeKey && userId) markSeen();
    }, [scopeKey, userId, markSeen])
  );

  // Editing is the author's alone. An Owner may remove a member's post but
  // never rewrite it under their name -- the same split as the RLS policies.
  // Ownership comes from the post's own household: under the all-households
  // scope that differs from one row to the next.
  const permissions = (post: Post | null) => {
    const canEdit = post !== null && post.authorId === userId;
    const isOwner = post !== null && (householdById.get(post.householdId)?.isOwner ?? false);

    return { canEdit, canDelete: canEdit || isOwner };
  };

  const renderItem = ({ item }: LegendListRenderItemProps<Post>) => {
    const { canEdit, canDelete } = permissions(item);

    return (
      <PostCard
        post={item}
        showActions={canEdit || canDelete}
        householdName={isMultiHousehold ? householdById.get(item.householdId)?.name : undefined}
        onToggleLike={() => toggleLike({ postId: item.id, liked: item.likedByMe })}
        onOpenActions={() => {
          setActivePost(item);
          void actionsSheetRef.current?.present();
        }}
        onOpen={() => router.push({ pathname: '/household/[postId]', params: { postId: item.id } })}
      />
    );
  };

  return (
    <ScreenView>
      <View style={styles.header}>
        <AppText variant="header" size={28} fontWeight="bold">
          Posts
        </AppText>
        <IconButton
          name="plus"
          variant="glass"
          size={20}
          accessibilityLabel="Share a photo"
          onPress={() =>
            router.push({
              pathname: '/household/new-post',
              params: scope === ALL_HOUSEHOLDS ? undefined : { householdId: scope }
            })
          }
        />
      </View>

      {isMultiHousehold && (
        <View style={styles.filter}>
          <PostFilterBar households={households} scope={scope} onChange={setScope} />
        </View>
      )}

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
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        keyExtractor={(post) => post.id}
        estimatedItemSize={640}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          // The list has no gutter of its own, so the empty state carries one.
          <View style={styles.emptyGutter}>
            <EmptyState
              icon="image"
              title="Nothing shared yet"
              description="Photos your household shares of your pets show up here. Handy when someone else is looking after them."
              action={<MainButton text="Share a photo" href="/household/new-post" />}
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
              pathname: '/household/[postId]/edit',
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

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.two
    },
    // No horizontal padding: PostBody re-indents its own words, and padding
    // here would inset the photo with them.
    listContent: {
      paddingBottom: spacing.six
    },
    separator: {
      height: spacing.four
    },
    emptyGutter: {
      paddingHorizontal: ScreenGutter
    },
    filter: {
      paddingBottom: spacing.three
    }
  });

export default Posts;
