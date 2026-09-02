import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = { current: number; steps: string[] };

const CIRCLE = 26;
const HALO = 4;

/**
 * Numbered phases with their names. A member on step 1 who can read "Feed
 * times" next knows the flow is short and knows what it wants.
 */
const FlowStepper = ({ current, steps }: Props) => {
  const styles = useStyles(makeStyles);
  const count = steps.length;

  // The rule joins circle centres, and every phase is an equal column, so the
  // first and last centres sit half a column in from each edge.
  const inset = 50 / count;
  const span = 100 - 2 * inset;
  const progress = count > 1 ? (current - 1) / (count - 1) : 0;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${count}`}>
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[styles.rule, { left: `${inset}%`, width: `${span}%` }]} />
        <View style={[styles.ruleDone, { left: `${inset}%`, width: `${span * progress}%` }]} />

        {steps.map((name, index) => {
          const step = index + 1;
          const isDone = step < current;
          const isCurrent = step === current;

          return (
            <View key={name} style={styles.phase}>
              <View style={[styles.halo, isCurrent && styles.haloCurrent]}>
                <View
                  style={[
                    styles.circle,
                    isDone && styles.circleDone,
                    isCurrent && styles.circleCurrent
                  ]}>
                  {isDone ? (
                    <Icon name="check" size={14} color="primaryText" strokeWidth={3.2} />
                  ) : (
                    <AppText
                      size={13}
                      color={isCurrent ? 'onPrimary' : 'textSecondary'}
                      fontWeight={isCurrent ? 'bold' : 'regular'}>
                      {step}
                    </AppText>
                  )}
                </View>
              </View>

              <AppText
                size={12}
                align="center"
                color={isCurrent ? 'text' : 'textSecondary'}
                fontWeight={isCurrent ? 'bold' : 'regular'}
                numberOfLines={1}>
                {name}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.one },
    track: { flexDirection: 'row', paddingVertical: HALO },
    rule: {
      position: 'absolute',
      top: HALO + CIRCLE / 2 - 1,
      height: 2,
      borderRadius: 2,
      backgroundColor: colors.border
    },
    ruleDone: {
      position: 'absolute',
      top: HALO + CIRCLE / 2 - 1,
      height: 2,
      borderRadius: 2,
      backgroundColor: colors.primary
    },
    phase: { flex: 1, alignItems: 'center', gap: 6 },
    // The halo grows outward from the circle, so it needs its own box. It is
    // what makes the filled circle read as "you are here" and not one more dot.
    halo: {
      padding: HALO,
      borderRadius: (CIRCLE + HALO * 2) / 2
    },
    haloCurrent: { backgroundColor: colors.primaryMuted },
    circle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.ghostBorder
    },
    circleDone: { backgroundColor: colors.primaryMuted, borderColor: 'transparent' },
    circleCurrent: { backgroundColor: colors.primary, borderColor: 'transparent' }
  });

export default FlowStepper;
