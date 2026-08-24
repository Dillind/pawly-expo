import AppText from '@/components/core/app-text';
import { ICON_ACTIVE_OPACITY } from '@/constants/primitives';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { StyleSheet, View } from 'react-native';

type Props = {
  liked: boolean;
  count: number;
  commentCount: number;
  onToggleLike: () => void;
  onOpenComments?: () => void;
};

const ICON_SIZE = 22;

/** Share is placed but deliberately not wired yet. */
const PostActionRow = ({
  liked,
  count,
  commentCount,
  onToggleLike,
  onOpenComments
}: Props) => {
  const styles = useStyles(makeStyles);

  const like = () => {
    hapticLight();
    onToggleLike();
  };

  return (
    <View style={styles.row}>
      <PressableOpacity
        style={styles.target}
        activeOpacity={ICON_ACTIVE_OPACITY}
        onPress={like}
        accessibilityRole="button"
        accessibilityState={{ selected: liked }}
        accessibilityLabel={liked ? 'Remove your like' : 'Like this post'}>
        <Icon
          name="heart"
          size={ICON_SIZE}
          color={liked ? 'like' : 'textSecondary'}
          fill={liked ? 'like' : undefined}
        />
        {count > 0 && (
          <AppText size={14} color={liked ? 'like' : 'textSecondary'} style={styles.count}>
            {count}
          </AppText>
        )}
      </PressableOpacity>

      <PressableOpacity
        style={styles.target}
        activeOpacity={ICON_ACTIVE_OPACITY}
        onPress={onOpenComments}
        disabled={!onOpenComments}
        accessibilityRole="button"
        accessibilityLabel={
          commentCount === 1 ? '1 comment' : `${commentCount} comments`
        }>
        <Icon name="comment" size={ICON_SIZE} color="textSecondary" />
        {commentCount > 0 && (
          <AppText size={14} color="textSecondary" style={styles.count}>
            {commentCount}
          </AppText>
        )}
      </PressableOpacity>

      <PressableOpacity style={styles.target} activeOpacity={ICON_ACTIVE_OPACITY}>
        <Icon name="share" size={ICON_SIZE} color="textSecondary" />
      </PressableOpacity>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      marginLeft: -spacing.one
    },
    target: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.one,
      height: 44,
      paddingHorizontal: spacing.one
    },
    count: {
      fontVariant: ['tabular-nums']
    }
  });

export default PostActionRow;
