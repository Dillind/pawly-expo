import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import ErrorState from '@/components/core/error-state';
import HeaderIconButton from '@/components/core/header-icon-button';
import ScreenView from '@/components/layout/screen-view';
import PostBody from '@/components/ui/post-body';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
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
  const { data: household } = useHousehold();
  const { data: post, isLoading, isError, refetch } = usePost(postId, userId ?? undefined);

  const { mutate: toggleLike } = useToggleLike(household?.id);
  const { mutate: deletePost } = useDeletePost(household?.id);

  const canEdit = post !== undefined && post.authorId === userId;
  const canDelete = canEdit || (post !== undefined && (household?.isOwner ?? false));

  const leave = () => {
    if (router.canGoBack()) return router.back();

    router.replace('/household');
  };

  return (
    <ScreenView edges={[]}>
      <Stack.Screen
        options={{
          headerTitle: 'Post Detail',
          headerRight:
            canEdit || canDelete
              ? () => (
                  <HeaderIconButton
                    name="ellipsis"
                    size={20}
                    accessibilityLabel="Manage this post"
                    onPress={() => void actionsSheetRef.current?.present()}
                  />
                )
              : undefined
        }}
      />

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
            onToggleLike={() => toggleLike({ postId: post.id, liked: post.likedByMe })}
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
              pathname: '/household/[postId]/edit',
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
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.three,
      paddingBottom: spacing.six
    }
  });

export default PostDetail;
