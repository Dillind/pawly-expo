import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import CrumpetMark from '@/components/core/crumpet-mark';
import { SplashPalette } from '@/constants/theme';

// Must equal `imageWidth` in the expo-splash-screen plugin options, or the mark
// jumps when the overlay takes over from the native launch screen.
const MARK_SIZE = 112;

const BREATH_MS = 900;
const BREATH_SCALE = 1.04;

// A floor that stops the overlay flashing past. A ready app leaves early: the
// breath has no end state, so an exit mid-cycle never reads as unfinished.
const MIN_HOLD_MS = 400;

const EXIT_MS = 240;

// The profile query can fail, and a splash that never leaves is worse than a
// first screen that loads in place.
const MAX_HOLD_MS = 4000;

type Props = {
  isAppReady: boolean;
  onFinish: () => void;
};

const AnimatedSplash = ({ isAppReady, onFinish }: Props) => {
  const isStill = useReducedMotion();

  const field = useSharedValue(1);
  const breath = useSharedValue(1);

  const [hasPlayed, setHasPlayed] = useState(isStill);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (isStill) return;

    breath.value = withRepeat(
      withTiming(BREATH_SCALE, { duration: BREATH_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [breath, isStill]);

  useEffect(() => {
    const played = setTimeout(() => setHasPlayed(true), isStill ? 0 : MIN_HOLD_MS);
    const overdue = setTimeout(() => setIsOverdue(true), MAX_HOLD_MS);

    return () => {
      clearTimeout(played);
      clearTimeout(overdue);
    };
  }, [isStill]);

  // The app mounts behind the overlay and its own layouts push a StatusBar entry
  // as they go. The last entry to mount wins, not the last in the tree, so
  // re-assert until the overlay leaves.
  useEffect(() => {
    const id = setInterval(() => setStatusBarStyle('dark'), 100);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hasPlayed) return;
    if (!isAppReady && !isOverdue) return;

    // Out, not the inOut default: an exit that eases in delays the frame the
    // user is waiting for.
    field.value = withTiming(
      0,
      { duration: EXIT_MS, easing: Easing.out(Easing.quad) },
      (isDone) => {
        if (isDone) runOnJS(onFinish)();
      }
    );
  }, [isAppReady, isOverdue, hasPlayed, field, onFinish]);

  // A gold field and the first screen share nothing, so a bare crossfade reads
  // as a cut. A small push-through joins them.
  const fieldStyle = useAnimatedStyle(() => ({
    opacity: field.value,
    transform: [{ scale: 1 + (1 - field.value) * 0.04 }]
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }]
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.field, fieldStyle]}>
      <View style={styles.fill}>
        <Animated.View style={markStyle}>
          <CrumpetMark
            size={MARK_SIZE}
            fill={SplashPalette.crumpet}
            holeFill={SplashPalette.crumpetHole}
          />
        </Animated.View>
      </View>

      {/* Last child on purpose: the bar honours whichever entry mounted last. */}
      <StatusBar style="dark" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  field: {
    backgroundColor: SplashPalette.field,
    zIndex: 10
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default AnimatedSplash;
