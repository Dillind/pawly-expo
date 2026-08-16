import PostActionRow from '@/components/ui/post-action-row';
import PostCaption from '@/components/ui/post-caption';
import PostHeader from '@/components/ui/post-header';
import PostLikers from '@/components/ui/post-likers';
import PostPetChips from '@/components/ui/post-pet-chips';
import PostPhotoCarousel from '@/components/ui/post-photo-carousel';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Post } from '@/services/post.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  post: Post;
  /** Set on the Posts tab only: Post Detail keeps its ⋯ in the header. */
  showActions?: boolean;
  captionLines?: number;
  onToggleLike: () => void;
  onOpenActions?: () => void;
  /**
   * Opens Post Detail. Only the photo and the caption carry it -- a whole-card
   * target would fire while paging photos or reaching for the like.
   */
  onOpen?: () => void;
};

/** Everything a Post shows, in one order, on both surfaces that show it. */
const PostBody = ({
  post,
  showActions,
  captionLines,
  onToggleLike,
  onOpenActions,
  onOpen
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.body}>
      <PostHeader post={post} showActions={showActions} onOpenActions={onOpenActions} />

      <PostCaption caption={post.caption} numberOfLines={captionLines} onPress={onOpen} />

      <PostPetChips pets={post.pets} />

      <PostPhotoCarousel photos={post.photos} onPress={onOpen} />

      <PostActionRow liked={post.likedByMe} count={post.likeCount} onToggleLike={onToggleLike} />

      <PostLikers likers={post.likers} />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    body: {
      gap: spacing.two
    }
  });

export default PostBody;
