import CommentActionsSheet from '@/components/bottom-sheets/comment-actions-sheet';
import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import CommentComposer from '@/components/ui/comment-composer';
import CommentThread from '@/components/ui/comment-thread';
import PostBody from '@/components/ui/post-body';
import { type AppTheme } from '@/constants/theme';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useToggleCommentLike
} from '@/hooks/queries/posts/use-comments';
import { useDeletePost, usePost, useToggleLike } from '@/hooks/queries/posts/use-posts';
import { useStyles } from '@/hooks/use-styles';
import type { PostComment } from '@/services/comment.service';
import { useAuthStore } from '@/stores/auth-store';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

/** What the composer is answering. Null composes a top-level comment. */
type ReplyTarget = { parentCommentId: string; replyToUserId: string | null; name: string };

const PostDetail = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const actionsSheetRef = useRef<TrueSheet | null>(null);
  const commentSheetRef = useRef<TrueSheet | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [managedComment, setManagedComment] = useState<PostComment | null>(null);

  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { userId } = useAuthStore();
  const { data: households = [] } = useHouseholds();
  const { data: post, isLoading, isError, refetch } = usePost(postId, userId ?? undefined);

  const { data: comments = [] } = useComments(postId, userId ?? undefined);

  const { mutate: toggleLike } = useToggleLike();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: addComment, isPending: isSending } = useCreateComment(postId);
  const { mutate: deleteComment } = useDeleteComment(postId);
  const { mutate: toggleCommentLike } = useToggleCommentLike(postId);

  const household = households.find((candidate) => candidate.id === post?.householdId);

  const canEdit = post !== undefined && post.authorId === userId;
  const canDelete = canEdit || (post !== undefined && (household?.isOwner ?? false));

  // The same test as private.can_manage_post: the post's author, or an Owner of
  // its household. It decides which comments offer a delete.
  const canManagePost = canDelete;

  const commentCount = comments.reduce((total, comment) => total + 1 + comment.replies.length, 0);

  const leave = () => {
    if (router.canGoBack()) return router.back();

    router.replace('/posts');
  };

  const startReply = (comment: PostComment) => {
    // A reply to a reply flattens under the same parent -- the thread is two
    // levels deep -- but still points at the sibling it answers.
    setReplyTarget({
      parentCommentId: comment.parentCommentId ?? comment.id,
      replyToUserId: comment.authorId,
      name: comment.author?.firstName ?? 'Member'
    });
  };

  const send = (body: string) => {
    if (!userId) return;

    addComment(
      {
        userId,
        body,
        parentCommentId: replyTarget?.parentCommentId ?? null,
        replyToUserId: replyTarget?.replyToUserId ?? null
      },
      {
        onSuccess: () => {
          setReplyTarget(null);
          // The new comment lands at the bottom of its group, which is usually
          // off screen on a post with photos.
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      }
    );
  };

  const confirmDeleteComment = () => {
    const target = managedComment;
    if (!target) return;

    const replyCount = target.replies.length;

    Alert.alert(
      'Delete this comment?',
      replyCount > 0
        ? `The ${replyCount === 1 ? 'reply' : `${replyCount} replies`} underneath will go too.`
        : undefined,
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteComment(target.id);
            setManagedComment(null);
          }
        }
      ]
    );
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
        <View style={styles.fill}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <PostBody
              post={post}
              householdName={households.length > 1 ? household?.name : undefined}
              commentCount={commentCount}
              onToggleLike={() => toggleLike({ postId: post.id, liked: post.likedByMe })}
              onOpenPhoto={(photoId) => router.push(`/posts/${post.id}/photo/${photoId}`)}
            />

            <CommentThread
              comments={comments}
              canManagePost={canManagePost}
              viewerId={userId ?? null}
              onToggleLike={(comment) =>
                toggleCommentLike({ commentId: comment.id, liked: comment.likedByMe })
              }
              onReply={startReply}
              onManage={(comment) => {
                setManagedComment(comment);
                void commentSheetRef.current?.present();
              }}
            />
          </ScrollView>

          {/* Rides the keyboard rather than being pushed by a padded scroller:
              the thread keeps its own scroll position while the composer moves. */}
          <KeyboardStickyView>
            <CommentComposer
              replyingToName={replyTarget?.name ?? null}
              isSending={isSending}
              onCancelReply={() => setReplyTarget(null)}
              onSend={send}
            />
          </KeyboardStickyView>
        </View>
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

      <CommentActionsSheet sheetRef={commentSheetRef} onDelete={confirmDeleteComment} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    fill: {
      flex: 1
    },
    centred: {
      paddingTop: spacing.six
    },
    content: {
      paddingTop: spacing.three,
      paddingBottom: spacing.four
    }
  });

export default PostDetail;
