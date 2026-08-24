import AppText from '@/components/core/app-text';
import { ICON_ACTIVE_OPACITY } from '@/constants/primitives';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import UserAvatar from '@/components/core/user-avatar';
import PostLikers from '@/components/ui/post-likers';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatRelativeTime } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import type { Post } from '@/services/post.service';
import { formatAuthorName } from '@/utils/members';
import { StyleSheet, View } from 'react-native';

type Props = {
  post: Post;
  onToggleLike: () => void;
  onOpenPost: () => void;
};

const AVATAR = 40;
const HEART = 22;

const CommentsPostSummary = ({ post, onToggleLike, onOpenPost }: Props) => {
  const styles = useStyles(makeStyles);
  const authorName = formatAuthorName(post.author);

  const like = () => {
    hapticLight();
    onToggleLike();
  };

  return (
    <View style={styles.summary}>
      <View style={styles.author}>
        <UserAvatar
          firstName={post.author?.firstName}
          lastName={post.author?.lastName}
          avatarUrl={post.author?.avatarUrl}
          size={AVATAR}
        />
        <View style={styles.authorText}>
          <AppText size={15} fontWeight="bold" numberOfLines={1}>
            {authorName}
          </AppText>
          <AppText size={13} color="textSecondary" numberOfLines={1}>
            {formatRelativeTime(post.occurredAt)}
            {post.editedAt ? ' · Edited' : ''}
          </AppText>
        </View>
      </View>

      <PressableOpacity
        style={styles.titleRow}
        onPress={onOpenPost}
        accessibilityRole="button"
        accessibilityLabel={`Open ${post.title ?? 'the post'}`}>
        <AppText size={20} fontWeight="bold" numberOfLines={2} style={styles.title}>
          {post.title ?? post.caption ?? 'Photo'}
        </AppText>
        <Icon name="caretRight" size={20} color="textSecondary" />
      </PressableOpacity>

      <View style={styles.likeRow}>
        <PressableOpacity
          style={styles.likeTarget}
          activeOpacity={ICON_ACTIVE_OPACITY}
          onPress={like}
          accessibilityRole="button"
          accessibilityState={{ selected: post.likedByMe }}
          accessibilityLabel={post.likedByMe ? 'Remove your like' : 'Like this post'}>
          <Icon
            name="heart"
            size={HEART}
            color={post.likedByMe ? 'like' : 'textSecondary'}
            fill={post.likedByMe ? 'like' : undefined}
          />
        </PressableOpacity>

        <PostLikers likers={post.likers} />
      </View>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    summary: {
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.two,
      gap: spacing.two,
      backgroundColor: colors.postSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border
    },
    author: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    authorText: {
      flex: 1,
      gap: spacing.half
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    title: {
      flex: 1
    },
    likeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      marginLeft: -spacing.one
    },
    likeTarget: {
      height: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.one
    }
  });

export default CommentsPostSummary;
