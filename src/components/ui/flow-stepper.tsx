import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = { current: number; count: number };

/**
 * How far through, and how far is left. A bar rather than numbered dots: the
 * steps have no meaning out of order, so numbering them would encode nothing
 * the position does not already say.
 */
const FlowStepper = ({ current, count }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${count}`}>
      <View style={styles.track}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={[styles.segment, index < current && styles.done]} />
        ))}
      </View>

      <AppText size={13} color="textSecondary">
        Step {current} of {count}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.one },
    track: { flexDirection: 'row', gap: spacing.one },
    segment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.backgroundElement
    },
    done: { backgroundColor: colors.primary }
  });

export default FlowStepper;
