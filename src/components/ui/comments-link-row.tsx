import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet } from 'react-native';

type Props = {
  count: number;
  onPress: () => void;
};

const label = (count: number): string => {
  if (count === 0) return 'Add a comment';
  if (count === 1) return 'View 1 comment';

  return `View all ${count} comments`;
};

const CommentsLinkRow = ({ count, onPress }: Props) => {
  const styles = useStyles(makeStyles);
  const text = label(count);

  return (
    <PressableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}>
      <AppText size={15} color="primaryText" fontWeight="bold" style={styles.label}>
        {text}
      </AppText>
      <Icon name="caretRight" size={18} color="primaryText" />
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.three,
      backgroundColor: colors.postSurface
    },
    label: {
      flex: 1
    }
  });

export default CommentsLinkRow;
