import PostBody from '@/components/ui/post-body';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowSmall } from '@/lib/styles/shadows';
import type { Post } from '@/services/post.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  post: Post;
  showActions: boolean;
  onToggleLike: () => void;
  onOpenActions: () => void;
  onOpen: () => void;
};

const CAPTION_LINES = 2;

/** A Post in the list. Post Detail renders the same PostBody without the card. */
const PostCard = ({ post, showActions, onToggleLike, onOpenActions, onOpen }: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.card, createShadowSmall(theme.colors)]}>
      <PostBody
        post={post}
        showActions={showActions}
        captionLines={CAPTION_LINES}
        onToggleLike={onToggleLike}
        onOpenActions={onOpenActions}
        onOpen={onOpen}
      />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      padding: spacing.four,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default PostCard;
