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
  onToggle: () => void;
};

/**
 * The count sits outside the tap target rather than inside it. Tapping a
 * number to change the number reads as a stepper; the thumb is the control and
 * the count is the readout.
 */
const PostLikeButton = ({ liked, count, onToggle }: Props) => {
  const styles = useStyles(makeStyles);

  const press = () => {
    hapticLight();
    onToggle();
  };

  return (
    <View style={styles.row}>
      <PressableOpacity
        style={styles.target}
        onPress={press}
        accessibilityRole="button"
        accessibilityState={{ selected: liked }}
        accessibilityLabel={liked ? 'Remove your like' : 'Like this post'}>
        <Icon name="thumbsUp" size={20} color={liked ? 'primary' : 'textSecondary'} />
      </PressableOpacity>
      {count > 0 && (
        <AppText size={14} color={liked ? 'primary' : 'textSecondary'}>
          {count}
        </AppText>
      )}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one
    },
    // 44pt, per the HIG minimum, without the icon growing to match.
    target: {
      width: 44,
      height: 44,
      marginLeft: -spacing.three,
      alignItems: 'center',
      justifyContent: 'center'
    }
  });

export default PostLikeButton;
