import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import PostActionRow from '@/components/ui/post-action-row';
import PostLikers from '@/components/ui/post-likers';
import PostPetChips from '@/components/ui/post-pet-chips';
import PostPhotoCarousel from '@/components/ui/post-photo-carousel';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/dates';
import { createShadowSmall } from '@/lib/styles/shadows';
import type { Post } from '@/services/post.service';
import { formatAuthorName } from '@/utils/members';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  post: Post;
  /**
   * Whether there is anything in the ⋯ menu for this viewer. Editing and
   * deleting are separate permissions -- the card only needs to know that at
   * least one of them applies, and gets no menu rather than an empty one.
   */
  showActions: boolean;
  onToggleLike: () => void;
  onOpenActions: () => void;
};

const CAPTION_LINES = 2;

const PostCard = ({ post, showActions, onToggleLike, onOpenActions }: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const authorName = formatAuthorName(post.author);

  return (
    <View style={[styles.card, createShadowSmall(theme.colors)]}>
      <View style={styles.header}>
        <AvatarInitials
          firstName={post.author?.firstName}
          lastName={post.author?.lastName}
          size={40}
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
        {showActions && (
          <IconButton
            name="ellipsis"
            variant="ghost"
            size={20}
            accessibilityLabel={`Manage ${authorName}'s post`}
            onPress={onOpenActions}
          />
        )}
      </View>

      {post.caption && (
        <PressableOpacity
          onPress={() => setCaptionExpanded((expanded) => !expanded)}
          accessibilityRole="button"
          accessibilityLabel={captionExpanded ? 'Collapse caption' : 'Expand caption'}>
          <AppText size={15} numberOfLines={captionExpanded ? undefined : CAPTION_LINES}>
            {post.caption}
          </AppText>
        </PressableOpacity>
      )}

      <PostPetChips pets={post.pets} />

      <PostPhotoCarousel photos={post.photos} />

      <PostActionRow liked={post.likedByMe} count={post.likeCount} onToggleLike={onToggleLike} />

      <PostLikers likers={post.likers} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
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

export default PostCard;
