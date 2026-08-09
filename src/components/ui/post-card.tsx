import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import PostLikeButton from '@/components/ui/post-like-button';
import PostPetChips from '@/components/ui/post-pet-chips';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatRelativeTime } from '@/lib/dates';
import type { Post } from '@/services/post.service';
import { formatAuthorName } from '@/utils/members';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  post: Post;
  /** Author or Owner. Anything else gets no menu rather than a disabled one. */
  canManage: boolean;
  onToggleLike: () => void;
  onOpenActions: () => void;
};

const CAPTION_LINES = 2;

const PostCard = ({ post, canManage, onToggleLike, onOpenActions }: Props) => {
  const styles = useStyles(makeStyles);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const authorName = formatAuthorName(post.author);
  const photoUrl = post.photoUrls[0];

  return (
    <View style={styles.card}>
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
          </AppText>
        </View>
        {/* Absent rather than disabled when you cannot act: a menu with one
            greyed row tells the user nothing and invites a pointless tap. */}
        {canManage && (
          <IconButton
            name="ellipsis"
            variant="ghost"
            size={20}
            accessibilityLabel={`Manage ${authorName}'s post`}
            onPress={onOpenActions}
          />
        )}
      </View>

      {/* Square, and the picker already cropped to square, so `cover` only ever
          corrects a stray older asset rather than silently chopping heads. */}
      {photoUrl && (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      )}

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

      <PostLikeButton liked={post.likedByMe} count={post.likeCount} onToggle={onToggleLike} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      gap: spacing.two,
      paddingVertical: spacing.four
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    headerText: {
      flex: 1,
      gap: spacing.half
    },
    photo: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: Radius.card,
      backgroundColor: colors.backgroundElement
    }
  });

export default PostCard;
