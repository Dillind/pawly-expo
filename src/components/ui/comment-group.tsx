import { StyleSheet, View } from 'react-native';

import CommentRow from '@/components/ui/comment-row';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostComment } from '@/services/comment.service';

type Props = {
  comment: PostComment;
  canManagePost: boolean;
  viewerId: string | null;
  onToggleLike: (comment: PostComment) => void;
  onReply: (comment: PostComment) => void;
  onManage: (comment: PostComment) => void;
};

const CommentGroup = ({
  comment,
  canManagePost,
  viewerId,
  onToggleLike,
  onReply,
  onManage
}: Props) => {
  const styles = useStyles(makeStyles);

  // Must match the delete policy in 20260822100000.
  const canDelete = (target: PostComment) =>
    canManagePost || (viewerId !== null && target.authorId === viewerId);

  return (
    <View style={styles.group}>
      <CommentRow
        comment={comment}
        onToggleLike={() => onToggleLike(comment)}
        onReply={() => onReply(comment)}
        onLongPress={canDelete(comment) ? () => onManage(comment) : undefined}
      />

      {comment.replies.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          isReply
          onToggleLike={() => onToggleLike(reply)}
          onReply={() => onReply(reply)}
          onLongPress={canDelete(reply) ? () => onManage(reply) : undefined}
        />
      ))}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    group: {
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.four,
      gap: spacing.three
    }
  });

export default CommentGroup;
