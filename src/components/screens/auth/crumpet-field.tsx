import { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import CrumpetMark from '@/components/core/crumpet-mark';

export type CrumpetSpec = {
  left: DimensionValue;
  top: DimensionValue;
  size: number;
  travelPt: number;
  spinDeg: number;
  durationMs: number;
  delayMs: number;
};

// Peak to peak, not amplitude. Past ~8pt the drift reads as a bug, not as air.
const DriftingCrumpet = ({
  left,
  top,
  size,
  travelPt,
  spinDeg,
  durationMs,
  delayMs,
  isStill
}: CrumpetSpec & { isStill: boolean }) => {
  // 0.5 is mid-arc, so a still crumpet rests rather than parking at one extreme.
  const drift = useSharedValue(isStill ? 0.5 : 0);
  const entrance = useSharedValue(isStill ? 1 : 0);

  useEffect(() => {
    if (isStill) return;

    drift.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    entrance.value = withDelay(delayMs, withTiming(1, { duration: 420 }));
  }, [drift, entrance, durationMs, delayMs, isStill]);

  const style = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { scale: 0.85 + entrance.value * 0.15 },
      { translateY: (drift.value - 0.5) * travelPt },
      { rotate: `${(drift.value - 0.5) * spinDeg}deg` }
    ]
  }));

  return (
    <Animated.View style={[styles.crumpet, { left, top }, style]}>
      <CrumpetMark size={size} />
    </Animated.View>
  );
};

type Props = {
  crumpets: CrumpetSpec[];
  style?: StyleProp<ViewStyle>;
};

const CrumpetField = ({ crumpets, style }: Props) => {
  const isStill = useReducedMotion();

  return (
    <View style={style} pointerEvents="none">
      {crumpets.map((crumpet) => (
        <DriftingCrumpet key={`${crumpet.left}-${crumpet.top}`} {...crumpet} isStill={isStill} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  crumpet: {
    position: 'absolute'
  }
});

export default CrumpetField;
