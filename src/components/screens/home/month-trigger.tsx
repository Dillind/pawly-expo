import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatMonthAndYear } from '@/lib/dates';
import { StyleSheet } from 'react-native';

export type MonthPopoverProps = {
  /** The day in view. Its month is the label, and the grid opens on it. */
  selectedDay: string;
  onSelectDay: (day: string) => void;
};

/**
 * The month label beside the day heading.
 *
 * Its own file: a `.ios.tsx` importing the shared half from the plain name
 * resolves back to itself. See KNOWLEDGE.md.
 */
const MonthTrigger = ({
  selectedDay,
  onPress
}: {
  selectedDay: string;
  onPress?: () => void;
}) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      style={styles.label}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatMonthAndYear(selectedDay)}. Pick a month.`}
      onPress={onPress}>
      <AppText size={13} fontWeight="bold" color="textSecondary" style={styles.month}>
        {formatMonthAndYear(selectedDay)}
      </AppText>
      {onPress && <Icon name="caretDown" size={14} color="textSecondary" />}
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    label: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one - 2
    },
    month: {
      letterSpacing: 0.8,
      textTransform: 'uppercase'
    }
  });

export default MonthTrigger;
