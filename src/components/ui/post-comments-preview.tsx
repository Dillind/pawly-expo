import AppText from '@/components/core/app-text';
import CommentRow from '@/components/ui/comment-row';
import CommentsLinkRow from '@/components/ui/comments-link-row';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostComment } from '@/services/comment.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  comments: PostComment[];
  count: number;
  onToggleLike: (comment: PostComment) => void;
  onOpenThread: () => void;
};

/** Two is enough to show that a conversation exists without becoming one. */
const PREVIEW = 2;

/**
 * The first comments, on Post Detail. Together with the whole caption and the
 * full-screen photo, this is what makes the screen worth the tap -- without it
 * detail shows exactly what the card already showed.
 *
 * Replies are deliberately absent. The preview answers "is anyone talking about
 * this", and the Thread answers everything after that.
 */
const PostCommentsPreview = ({ comments, count, onToggleLike, onOpenThread }: Props) => {
  const styles = useStyles(makeStyles);

  if (count === 0) return <CommentsLinkRow count={0} onPress={onOpenThread} />;

  return (
    <View style={styles.section}>
      <AppText size={17} fontWeight="bold" style={styles.heading}>
        Comments
      </AppText>

      <View style={styles.rows}>
        {comments.slice(0, PREVIEW).map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onToggleLike={() => onToggleLike(comment)}
            onReply={onOpenThread}
            onLongPress={onOpenThread}
          />
        ))}
      </View>

      <CommentsLinkRow count={count} onPress={onOpenThread} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    section: {
      paddingTop: spacing.three,
      gap: spacing.two,
      backgroundColor: colors.postSurface
    },
    heading: {
      paddingHorizontal: ScreenGutter
    },
    rows: {
      paddingHorizontal: ScreenGutter,
      gap: spacing.three
    }
  });

export default PostCommentsPreview;
