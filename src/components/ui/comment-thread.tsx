import AppText from '@/components/core/app-text';
import CommentRow from '@/components/ui/comment-row';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostComment } from '@/services/comment.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  comments: PostComment[];
  canManagePost: boolean;
  viewerId: string | null;
  onToggleLike: (comment: PostComment) => void;
  onReply: (comment: PostComment) => void;
  onManage: (comment: PostComment) => void;
};

const CommentThread = ({
  comments,
  canManagePost,
  viewerId,
  onToggleLike,
  onReply,
  onManage
}: Props) => {
  const styles = useStyles(makeStyles);

  // Must match the delete policy in 20260822100000.
  const canDelete = (comment: PostComment) =>
    canManagePost || (viewerId !== null && comment.authorId === viewerId);

  if (comments.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText size={15} color="textSecondary" align="center">
          No comments yet. Say something nice.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.thread}>
      {comments.map((comment) => (
        <View key={comment.id} style={styles.group}>
          <CommentRow
            comment={comment}
            canDelete={canDelete(comment)}
            onToggleLike={() => onToggleLike(comment)}
            onReply={() => onReply(comment)}
            onLongPress={() => onManage(comment)}
          />

          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              isReply
              canDelete={canDelete(reply)}
              onToggleLike={() => onToggleLike(reply)}
              onReply={() => onReply(reply)}
              onLongPress={() => onManage(reply)}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    thread: {
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.three,
      gap: spacing.four
    },
    group: {
      gap: spacing.three
    },
    empty: {
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.five
    }
  });

export default CommentThread;
