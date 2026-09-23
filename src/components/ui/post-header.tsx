import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import UserAvatar from '@/components/core/user-avatar';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatRelativeTime } from '@/lib/dates';
import type { Post } from '@/services/post.service';
import { formatAuthorName } from '@/utils/members';

type Props = {
  post: Post;
  // Whether there is anything in the ⋯ menu for this viewer. Editing and deleting are separate
  // permissions -- the header only needs to know that at least one of them applies, and gets no
  // menu rather than an empty one.
  showActions?: boolean;
  householdName?: string;
  onOpenActions?: () => void;
};

const AVATAR = 40;

const PostHeader = ({ post, showActions = false, householdName, onOpenActions }: Props) => {
  const styles = useStyles(makeStyles);
  const authorName = formatAuthorName(post.author);

  return (
    <View style={styles.header}>
      <UserAvatar
        firstName={post.author?.firstName}
        lastName={post.author?.lastName}
        avatarUrl={post.author?.avatarUrl}
        size={AVATAR}
      />
      <View style={styles.headerText}>
        <AppText size="callout" fontWeight="bold" numberOfLines={1}>
          {householdName ?? authorName}
        </AppText>
        <AppText size="footnote" color="textSecondary" numberOfLines={1}>
          {householdName ? `${authorName} · ` : ''}
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
          size={IconSize.action}
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
