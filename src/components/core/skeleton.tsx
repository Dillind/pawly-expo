import { useEffect, type ReactNode } from 'react';
import { StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const PULSE_MS = 800;
const DIM_OPACITY = 0.45;

type PulseProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** The whole screen it stands in for, so VoiceOver has something to say. */
  accessibilityLabel?: string;
};

/**
 * Wraps a set of placeholder blocks and breathes them together. One pulse for
 * the whole group, never one per block -- separate loops drift apart within a
 * second or two and the screen starts to shimmer.
 */
export const SkeletonPulse = ({ children, style, accessibilityLabel }: PulseProps) => {
  const isReducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isReducedMotion) return;

    pulse.value = withRepeat(
      withSequence(
        withTiming(DIM_OPACITY, { duration: PULSE_MS }),
        withTiming(1, { duration: PULSE_MS })
      ),
      -1
    );
  }, [isReducedMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[style, pulseStyle]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}>
      {children}
    </Animated.View>
  );
};

type BlockProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** One placeholder block, in the page colour rather than a grey of its own. */
export const SkeletonBlock = ({
  width = '100%',
  height = 12,
  radius = Radius.full,
  style
}: BlockProps) => {
  const styles = useStyles(makeStyles);

  return <Animated.View style={[styles.block, { width, height, borderRadius: radius }, style]} />;
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    block: {
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSelected
    }
  });
