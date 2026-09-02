import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import CommentActionsSheet from '@/components/bottom-sheets/comment-actions-sheet';
import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import CommentComposer from '@/components/ui/comment-composer';
import CommentThread from '@/components/ui/comment-thread';
import CommentsEmpty from '@/components/ui/comments-empty';
import CommentsPostSummary from '@/components/ui/comments-post-summary';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useToggleCommentLike
} from '@/hooks/queries/posts/use-comments';
import { usePost, useToggleLike } from '@/hooks/queries/posts/use-posts';
import { useStyles } from '@/hooks/use-styles';
import type { PostComment } from '@/services/comment.service';
import { useAuthStore } from '@/stores/auth-store';

/** What the composer is answering. Null composes a top-level comment. */
type ReplyTarget = { parentCommentId: string; replyToUserId: string | null; name: string };

const Comments = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const commentSheetRef = useRef<TrueSheet | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  // Bumped only once a comment lands, so a failed send keeps the draft.
  const [sentCount, setSentCount] = useState(0);
  const [managedComment, setManagedComment] = useState<PostComment | null>(null);

  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { userId } = useAuthStore();
  const { data: households = [] } = useHouseholds();
  const { data: post, isLoading, isError, refetch } = usePost(postId, userId ?? undefined);

  const { data: comments = [] } = useComments(postId, userId ?? undefined);

  const { mutate: toggleLike } = useToggleLike();
  const { mutate: addComment, isPending: isSending } = useCreateComment(postId);
  const { mutate: deleteComment } = useDeleteComment(postId);
  const { mutate: toggleCommentLike } = useToggleCommentLike(postId);

  const household = households.find((candidate) => candidate.id === post?.householdId);

  // The same test as private.can_manage_post.
  const canManagePost =
    post !== undefined && (post.authorId === userId || (household?.isOwner ?? false));

  // A reply to a reply flattens under the same parent, still pointing at the
  // sibling it answers.
  const startReply = (comment: PostComment) => {
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
          setSentCount((count) => count + 1);
          setReplyTarget(null);
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
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={-BottomTabInset}
          style={styles.fill}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <CommentsPostSummary
              post={post}
              onToggleLike={() => toggleLike({ postId: post.id, liked: post.likedByMe })}
              onOpenPost={() =>
                router.push({ pathname: '/posts/[postId]', params: { postId: post.id } })
              }
            />

            {comments.length === 0 ? (
              <CommentsEmpty />
            ) : (
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
            )}
          </ScrollView>

          <CommentComposer
            replyingToName={replyTarget?.name ?? null}
            isSending={isSending}
            sentCount={sentCount}
            onCancelReply={() => setReplyTarget(null)}
            onSend={send}
          />
        </KeyboardAvoidingView>
      )}

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
      paddingBottom: spacing.four
    }
  });

export default Comments;
