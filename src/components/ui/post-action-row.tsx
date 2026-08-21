import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { StyleSheet, View } from 'react-native';

type Props = {
  liked: boolean;
  count: number;
  onToggleLike: () => void;
};

const ICON_SIZE = 22;

/** Comment and share are placed but deliberately not wired yet. */
const PostActionRow = ({ liked, count, onToggleLike }: Props) => {
  const styles = useStyles(makeStyles);

  const like = () => {
    hapticLight();
    onToggleLike();
  };

  return (
    <View style={styles.row}>
      <PressableOpacity
        style={styles.likeTarget}
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

      <View style={styles.target}>
        <Icon name="comment" size={ICON_SIZE} color="textSecondary" />
      </View>

      <View style={styles.target}>
        <Icon name="share" size={ICON_SIZE} color="textSecondary" />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: -spacing.one
    },
    // Narrower than they are tall. The full 44pt height keeps the target legal
    // while the icons sit as close together as Hevy's.
    target: {
      width: 38,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center'
    },
    likeTarget: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      height: 44,
      paddingHorizontal: spacing.one
    },
    count: {
      fontVariant: ['tabular-nums']
    }
  });

export default PostActionRow;
