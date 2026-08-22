import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useEffect } from 'react';

const PULSE_MS = 700;

const AVATAR_SIZE = 40;
const NAME_HEIGHT = 22;
const SUMMARY_HEIGHT = 16;

/**
 * The shape of a collapsed PetSection, drawn while the day is still loading.
 * Every measurement here is taken from that card so the screen does not move
 * when the real one replaces it — change one and change both.
 */
const PetSectionSkeleton = () => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isReducedMotion) return;

    pulse.value = withRepeat(
      withSequence(withTiming(0.45, { duration: PULSE_MS }), withTiming(1, { duration: PULSE_MS })),
      -1
    );
  }, [isReducedMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      style={[styles.card, createShadowMedium(theme.colors)]}
      accessibilityLabel="Loading today's feeds"
      accessibilityRole="progressbar">
      <Animated.View style={[styles.headerRow, pulseStyle]}>
        <View style={styles.avatar} />

        <View style={styles.names}>
          <View style={[styles.line, styles.name]} />
          <View style={[styles.line, styles.summary]} />
        </View>
      </Animated.View>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.one
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    names: {
      flex: 1,
      gap: 2
    },
    line: {
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSelected
    },
    // Two lengths rather than two full-width bars: a name is short and the line
    // under it is long, and that difference is what reads as a pet card.
    name: {
      width: '38%',
      height: NAME_HEIGHT
    },
    summary: {
      width: '72%',
      height: SUMMARY_HEIGHT
    }
  });

export default PetSectionSkeleton;
