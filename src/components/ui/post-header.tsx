import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import IconButton from '@/components/core/icon-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatRelativeTime } from '@/lib/dates';
import type { Post } from '@/services/post.service';
import { formatAuthorName } from '@/utils/members';
import { StyleSheet, View } from 'react-native';

type Props = {
  post: Post;
  /**
   * Whether there is anything in the ⋯ menu for this viewer. Editing and
   * deleting are separate permissions -- the header only needs to know that at
   * least one of them applies, and gets no menu rather than an empty one.
   */
  showActions?: boolean;
  onOpenActions?: () => void;
};

const AVATAR = 40;

const PostHeader = ({ post, showActions = false, onOpenActions }: Props) => {
  const styles = useStyles(makeStyles);
  const authorName = formatAuthorName(post.author);

  return (
    <View style={styles.header}>
      <AvatarInitials
        firstName={post.author?.firstName}
        lastName={post.author?.lastName}
        size={AVATAR}
      />
      <View style={styles.headerText}>
        <AppText size={15} fontWeight="bold">
          {authorName}
        </AppText>
        <AppText size={13} color="textSecondary">
          {formatRelativeTime(post.occurredAt)}
          {post.editedAt ? ' · Edited' : ''}
        </AppText>
      </View>
      {/* Absent rather than disabled when you cannot act: a menu with one
          greyed row tells the user nothing and invites a pointless tap. */}
      {showActions && onOpenActions && (
        <IconButton
          name="ellipsis"
          variant="ghost"
          size={20}
          accessibilityLabel={`Manage ${authorName}'s post`}
          onPress={onOpenActions}
        />
      )}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    headerText: {
      flex: 1,
      gap: spacing.half
    }
  });

export default PostHeader;
