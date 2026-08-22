import AppText from '@/components/core/app-text';
import CommentRow from '@/components/ui/comment-row';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostComment } from '@/services/comment.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  comments: PostComment[];
  /** Decides which rows offer a delete: the post's author, or a household Owner. */
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

  // Matches the delete policy in 20260822100000. Getting this wrong in either
  // direction is visible: a menu that fails, or an action quietly withheld from
  // someone entitled to it.
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

          {/* Always expanded, with no "Hide replies" toggle. Collapse exists to
              compress threads with hundreds of replies, which a household of
              four cannot produce. */}
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              isReply
              canDelete={canDelete(reply)}
              onToggleLike={() => onToggleLike(reply)}
              // Replying to a reply flattens under the same parent, and the
              // prefix is what records which sibling was answered.
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
    /** A reply belongs to its parent, so the gap inside a group is the tighter one. */
    group: {
      gap: spacing.three
    },
    empty: {
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.five
    }
  });

export default CommentThread;
