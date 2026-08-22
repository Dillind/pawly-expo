import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import UserAvatar from '@/components/core/user-avatar';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatRelativeTime } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import type { PostComment } from '@/services/comment.service';
import { formatAuthorName } from '@/utils/members';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  comment: PostComment;
  /** A reply sits inset under its parent, with a smaller avatar. */
  isReply?: boolean;
  canDelete: boolean;
  onToggleLike: () => void;
  onReply: () => void;
  onLongPress: () => void;
};

const AVATAR = 32;
const REPLY_AVATAR = 26;
const LIKE_ICON = 16;

const CommentRow = ({
  comment,
  isReply = false,
  canDelete,
  onToggleLike,
  onReply,
  onLongPress
}: Props) => {
  const styles = useStyles(useCallback((theme: AppTheme) => makeStyles(theme, isReply), [isReply]));
  const authorName = formatAuthorName(comment.author);

  const like = () => {
    hapticLight();
    onToggleLike();
  };

  return (
    <PressableOpacity
      style={styles.row}
      // Long press rather than a ⋯ on every row: the menu holds one action for
      // most people and none at all for the rest, and a control that is usually
      // absent is worse than one that is never drawn.
      onLongPress={canDelete ? onLongPress : undefined}
      delayLongPress={400}
      // Not an accessibility element itself. A label here collapses the whole
      // row into one node and VoiceOver loses Reply and the like entirely --
      // the long press is a shortcut, not the row's only way in.
      accessible={false}>
      <UserAvatar
        firstName={comment.author?.firstName}
        lastName={comment.author?.lastName}
        avatarUrl={comment.author?.avatarUrl}
        size={isReply ? REPLY_AVATAR : AVATAR}
      />

      <View style={styles.content}>
        <View style={styles.meta}>
          <AppText size={14} fontWeight="bold" numberOfLines={1}>
            {authorName}
          </AppText>
          <AppText size={13} color="textSecondary">
            {formatRelativeTime(comment.createdAt)}
          </AppText>
        </View>

        <AppText size={15}>
          {/* Rendered from reply_to_user_id, never parsed out of the body. The
              prefix is styled but not tappable -- there is no member profile to
              open, and a link that goes nowhere is worse than plain text. */}
          {comment.replyToName && (
            <AppText size={15} color="primary" fontWeight="bold">
              {`@${comment.replyToName} `}
            </AppText>
          )}
          {comment.body}
        </AppText>

        <PressableOpacity
          style={styles.replyTarget}
          onPress={onReply}
          accessibilityRole="button"
          accessibilityLabel={`Reply to ${authorName}`}>
          <AppText size={13} color="textSecondary" fontWeight="bold">
            Reply
          </AppText>
        </PressableOpacity>
      </View>

      {/* Its own column, so a long comment stays ragged-right instead of
          wrapping around a control. */}
      <PressableOpacity
        style={styles.likeTarget}
        onPress={like}
        accessibilityRole="button"
        accessibilityState={{ selected: comment.likedByMe }}
        accessibilityLabel={
          comment.likedByMe ? 'Remove your like' : `Like ${authorName}'s comment`
        }>
        <Icon
          name="heart"
          size={LIKE_ICON}
          color={comment.likedByMe ? 'like' : 'textSecondary'}
          fill={comment.likedByMe ? 'like' : undefined}
        />
        {comment.likeCount > 0 && (
          <AppText
            size={12}
            color={comment.likedByMe ? 'like' : 'textSecondary'}
            style={styles.likeCount}>
            {comment.likeCount}
          </AppText>
        )}
      </PressableOpacity>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing }: AppTheme, isReply: boolean) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.two,
      // The inset is the parent's avatar plus its gap, so a reply lines up with
      // the parent's words rather than with an arbitrary indent.
      paddingLeft: isReply ? AVATAR + spacing.two : 0
    },
    content: {
      flex: 1,
      gap: spacing.half
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    // Sits tight under the words: a full 44pt box here would open a gap wide
    // enough to read as a break between comments.
    replyTarget: {
      paddingVertical: spacing.one,
      alignSelf: 'flex-start',
      paddingRight: spacing.three
    },
    likeTarget: {
      alignItems: 'center',
      gap: spacing.half,
      paddingHorizontal: spacing.one,
      paddingTop: spacing.half
    },
    likeCount: {
      fontVariant: ['tabular-nums']
    }
  });

export default CommentRow;
