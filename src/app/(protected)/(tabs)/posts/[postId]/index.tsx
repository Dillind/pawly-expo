import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import CommentsLinkRow from '@/components/ui/comments-link-row';
import PostBody from '@/components/ui/post-body';
import { type AppTheme } from '@/constants/theme';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import { useDeletePost, usePost, useToggleLike } from '@/hooks/queries/posts/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

const PostDetail = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const actionsSheetRef = useRef<TrueSheet | null>(null);

  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { userId } = useAuthStore();
  const { data: households = [] } = useHouseholds();
  const { data: post, isLoading, isError, refetch } = usePost(postId, userId ?? undefined);

  const { mutate: toggleLike } = useToggleLike();
  const { mutate: deletePost } = useDeletePost();

  const household = households.find((candidate) => candidate.id === post?.householdId);

  const canEdit = post !== undefined && post.authorId === userId;
  const canDelete = canEdit || (post !== undefined && (household?.isOwner ?? false));

  const leave = () => {
    if (router.canGoBack()) return router.back();

    router.replace('/posts');
  };

  return (
    <ScreenView edges={[]}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="ellipsis"
          accessibilityLabel="Manage this post"
          hidden={!canEdit && !canDelete}
          onPress={() => void actionsSheetRef.current?.present()}
        />
      </Stack.Toolbar>

      {isLoading && <ActivityIndicator style={styles.centred} />}

      {isError && (
        <ErrorState
          title="Couldn't load this post"
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {post && (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}>
          <PostBody
            post={post}
            householdName={households.length > 1 ? household?.name : undefined}
            commentCount={post.commentCount}
            onToggleLike={() => toggleLike({ postId: post.id, liked: post.likedByMe })}
            onOpenPhoto={(photoId) => router.push(`/posts/${post.id}/photo/${photoId}`)}
            onOpenComments={() =>
              router.push({ pathname: '/posts/[postId]/comments', params: { postId: post.id } })
            }
          />

          <CommentsLinkRow
            count={post.commentCount}
            onPress={() =>
              router.push({ pathname: '/posts/[postId]/comments', params: { postId: post.id } })
            }
          />
        </ScrollView>
      )}

      <PostActionsSheet
        sheetRef={actionsSheetRef}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => {
          if (post) {
            router.push({
              pathname: '/posts/[postId]/edit',
              params: { postId: post.id }
            });
          }
        }}
        onDelete={() => {
          if (!post) return;

          deletePost(post.id);
          leave();
        }}
      />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    centred: {
      paddingTop: spacing.six
    },
    content: {
      paddingBottom: spacing.four
    }
  });

export default PostDetail;
