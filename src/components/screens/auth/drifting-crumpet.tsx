import { useEffect } from 'react';
import { StyleSheet, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import CrumpetMark from '@/components/core/crumpet-mark';

/**
 * One crumpet that fades in, then floats on its own loop forever.
 *
 * `travel` and `spin` stay small -- past about 8pt the drift stops looking like
 * air and starts looking like a bug. The parent positions it, so this knows
 * nothing about where on the screen it sits.
 */
export type CrumpetSpec = {
  left: DimensionValue;
  top: DimensionValue;
  size: number;
  travel: number;
  spin: number;
  duration: number;
  delay: number;
};

type Props = CrumpetSpec & { isStill: boolean };

const DriftingCrumpet = ({ left, top, size, travel, spin, duration, delay, isStill }: Props) => {
  const drift = useSharedValue(isStill ? 1 : 0);
  const entrance = useSharedValue(isStill ? 1 : 0);

  useEffect(() => {
    if (isStill) return;

    drift.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    entrance.value = withDelay(delay, withTiming(1, { duration: 420 }));
  }, [drift, entrance, duration, delay, isStill]);

  const style = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { scale: 0.85 + entrance.value * 0.15 },
      { translateY: -travel + drift.value * travel * 2 },
      { rotate: `${-spin + drift.value * spin * 2}deg` }
    ]
  }));

  return (
    <Animated.View style={[styles.crumpet, { left, top }, style]}>
      <CrumpetMark size={size} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  crumpet: {
    position: 'absolute'
  }
});

export default DriftingCrumpet;
