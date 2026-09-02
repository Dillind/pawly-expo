import PostActionRow from '@/components/ui/post-action-row';
import PostCaption from '@/components/ui/post-caption';
import PostHeader from '@/components/ui/post-header';
import PostLikers from '@/components/ui/post-likers';
import PostChips from '@/components/ui/post-chips';
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
  /** Post Detail only: opens one photo full screen. */
  onOpenPhoto?: (photoId: string) => void;
  commentCount?: number;
  onOpenComments?: () => void;
};

const PostBody = ({
  post,
  showActions,
  householdName,
  titleLines,
  captionLines,
  onOpenPhoto,
  onToggleLike,
  onOpenActions,
  onOpen,
  commentCount = 0,
  onOpenComments
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

        <PostChips occasion={post.occasion} pets={post.pets} />
      </View>

      <PostPhotoCarousel photos={post.photos} onPress={onOpen} onPressPhoto={onOpenPhoto} />

      <View style={[styles.gutter, styles.actions]}>
        <PostActionRow
          liked={post.likedByMe}
          count={post.likeCount}
          commentCount={commentCount}
          onToggleLike={onToggleLike}
          onOpenComments={onOpenComments}
        />

        <PostLikers likers={post.likers} />
      </View>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    body: {
      gap: spacing.two,
      paddingVertical: spacing.two,
      backgroundColor: colors.postSurface
    },
    gutter: {
      paddingHorizontal: ScreenGutter,
      gap: spacing.two
    },
    words: {
      gap: spacing.one
    },
    actions: {
      gap: 0
    }
  });

export default PostBody;
