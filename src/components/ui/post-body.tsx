import PostActionRow from '@/components/ui/post-action-row';
import PostCaption from '@/components/ui/post-caption';
import PostHeader from '@/components/ui/post-header';
import PostLikers from '@/components/ui/post-likers';
import PostPetChips from '@/components/ui/post-pet-chips';
import PostPhotoCarousel from '@/components/ui/post-photo-carousel';
import PostTitle from '@/components/ui/post-title';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Post } from '@/services/post.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  post: Post;
  /** Set on the Posts tab only: Post Detail keeps its ⋯ in the header. */
  showActions?: boolean;
  householdName?: string;
  titleLines?: number;
  captionLines?: number;
  onToggleLike: () => void;
  onOpenActions?: () => void;
  /**
   * Opens Post Detail. Only the photo and the caption carry it -- a whole-card
   * target would fire while paging photos or reaching for the like.
   */
  onOpen?: () => void;
};

/**
 * Everything a Post shows, in one order, on both surfaces that show it.
 *
 * The gutter is owned here because a parent that padded this would inset the
 * photo with the words. Both screens hand it the full width.
 */
const PostBody = ({
  post,
  showActions,
  householdName,
  titleLines,
  captionLines,
  onToggleLike,
  onOpenActions,
  onOpen
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.body}>
      <View style={styles.gutter}>
        <PostHeader
          post={post}
          showActions={showActions}
          householdName={householdName}
          onOpenActions={onOpenActions}
        />

        <View style={styles.words}>
          <PostTitle title={post.title} numberOfLines={titleLines} onPress={onOpen} />

          <PostCaption caption={post.caption} numberOfLines={captionLines} onPress={onOpen} />
        </View>

        <PostPetChips pets={post.pets} />
      </View>

      <PostPhotoCarousel photos={post.photos} onPress={onOpen} />

      <View style={styles.gutter}>
        <PostActionRow liked={post.likedByMe} count={post.likeCount} onToggleLike={onToggleLike} />

        <PostLikers likers={post.likers} />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    body: {
      gap: spacing.two
    },
    gutter: {
      paddingHorizontal: ScreenGutter,
      gap: spacing.two
    },
    /** The title names what the description elaborates, so they sit closer. */
    words: {
      gap: spacing.one
    }
  });

export default PostBody;
