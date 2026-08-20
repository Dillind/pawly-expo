import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import MainLegendList from '@/components/core/main-legend-list';
import ScreenView from '@/components/layout/screen-view';
import PostCard from '@/components/ui/post-card';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
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
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const Posts = () => {
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
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const { mutate: toggleLike } = useToggleLike(householdId);
  const { mutate: deletePost } = useDeletePost(householdId);
  const { mutate: markSeen } = useMarkPostsSeen(householdId, userId ?? undefined);

  // Clearing the dot is a side effect of arriving, not of the data loading, so
  // it fires on focus rather than in an effect keyed on the query.
  useFocusEffect(
    useCallback(() => {
      if (householdId && userId) markSeen();
    }, [householdId, userId, markSeen])
  );

  // Editing is the author's alone. An Owner may remove a member's post but
  // never rewrite it under their name -- the same split as the RLS policies.
  const permissions = (post: Post | null) => {
    const canEdit = post !== null && post.authorId === userId;

    return { canEdit, canDelete: canEdit || (post !== null && isOwner) };
  };

  const renderItem = ({ item }: LegendListRenderItemProps<Post>) => {
    const { canEdit, canDelete } = permissions(item);

    return (
      <PostCard
        post={item}
        showActions={canEdit || canDelete}
        onToggleLike={() => toggleLike({ postId: item.id, liked: item.likedByMe })}
        onOpenActions={() => {
          setActivePost(item);
          void actionsSheetRef.current?.present();
        }}
        onOpen={() =>
          router.push({ pathname: '/household/[postId]', params: { postId: item.id } })
        }
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
    // No horizontal padding: the photo runs to both screen edges and PostBody
    // re-indents its own words. Padding here would inset the photo with them.
    listContent: {
      paddingBottom: spacing.six
    },
    separator: {
      height: spacing.four
    },
    emptyGutter: {
      paddingHorizontal: ScreenGutter
    }
  });

export default Posts;
