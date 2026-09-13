import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import CrumpetMark from '@/components/core/crumpet-mark';
import PetHead, { type PetKind } from '@/components/screens/splash/pet-head';
import { SplashPalette } from '@/constants/theme';

const STAGE_SIZE = 260;

/**
 * Must equal `imageWidth` in the expo-splash-screen plugin options, and the
 * hero must sit at true screen centre where the native image already is. The
 * hero therefore never animates -- it is the one thing that does not move.
 */
const HERO_SIZE = 112;

/**
 * A floor that stops the overlay flashing past, not a wait for the sequence,
 * which ends near 930ms -- the last head starts its rise at 470ms and RISE
 * settles about 460ms after that.
 *
 * A ready app therefore leaves early, and the remaining pops play out under the
 * fade. An animation cut short by real progress reads as fast. One that holds
 * real progress reads as slow.
 */
const MIN_HOLD_MS = 400;

const EXIT_MS = 240;

/**
 * The ceiling on the wait for `isAppReady`. The profile query can fail, and a
 * splash that never leaves is worse than a first screen that loads in place.
 */
const MAX_HOLD_MS = 4000;

const POP = { damping: 11, stiffness: 190, mass: 0.7 } as const;
const RISE = { damping: 14, stiffness: 170, mass: 0.8 } as const;

type Companion = {
  kind: PetKind;
  left: number;
  top: number;
  size: number;
  delayMs: number;
};

// Placed by hand around the hero, which owns the middle 112pt of the stage.
const COMPANIONS: Companion[] = [
  { kind: 'retriever', left: 4, top: 24, size: 56, delayMs: 120 },
  { kind: 'tabby', left: 192, top: 4, size: 48, delayMs: 200 },
  { kind: 'shorthair', left: 0, top: 178, size: 50, delayMs: 280 },
  { kind: 'westie', left: 196, top: 170, size: 52, delayMs: 360 }
];

const PoppingCompanion = ({
  kind,
  left,
  top,
  size,
  delayMs,
  isStill
}: Companion & { isStill: boolean }) => {
  const pop = useSharedValue(isStill ? 1 : 0);
  const peek = useSharedValue(isStill ? 1 : 0);

  // Its own value, not pop's: POP is underdamped and overshoots past 1, and a
  // fade does not want the bounce the scale is there for.
  const fade = useSharedValue(isStill ? 1 : 0);

  const headBox = size * 0.82;

  // Parked deep enough inside the disc that the ears do not clear its top edge.
  // Past ~0.70 the chin drops below the disc and shows for a frame.
  const headHidden = size * 0.7;

  // The Recraft heads fill their box, so a rest of 0 would lift almost the whole
  // head clear of the crumpet and stop reading as a peek.
  const headRest = size * 0.12;

  useEffect(() => {
    if (isStill) return;

    pop.value = withDelay(delayMs, withSpring(1, POP));
    fade.value = withDelay(delayMs, withTiming(1, { duration: 160 }));
    peek.value = withDelay(delayMs + 110, withSpring(1, RISE));
  }, [pop, fade, peek, delayMs, isStill]);

  // The pop scales the head with the disc, never the disc alone. A disc at 0.4
  // no longer covers the head parked behind it, so the head would float on the
  // gold with no crumpet under it.
  const groupStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: 0.4 + pop.value * 0.6 }]
  }));

  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headRest + (headHidden - headRest) * (1 - peek.value) }]
  }));

  return (
    <View style={[styles.companion, { left, top, width: size, height: size * 1.55 }]}>
      <Animated.View style={[styles.group, groupStyle]}>
        <Animated.View style={[styles.head, { width: headBox, height: headBox }, headStyle]}>
          <PetHead kind={kind} size={headBox} />
        </Animated.View>

        <View style={styles.disc}>
          <CrumpetMark
            size={size}
            fill={SplashPalette.crumpet}
            holeFill={SplashPalette.crumpetHole}
          />
        </View>
      </Animated.View>
    </View>
  );
};

type Props = {
  /** The app behind the overlay has finished its own loading. */
  isAppReady: boolean;
  onFinish: () => void;
};

const AnimatedSplash = ({ isAppReady, onFinish }: Props) => {
  const isStill = useReducedMotion();

  const field = useSharedValue(1);

  const [hasPlayed, setHasPlayed] = useState(isStill);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const played = setTimeout(() => setHasPlayed(true), isStill ? 0 : MIN_HOLD_MS);
    const overdue = setTimeout(() => setIsOverdue(true), MAX_HOLD_MS);

    return () => {
      clearTimeout(played);
      clearTimeout(overdue);
    };
  }, [isStill]);

  // The app mounts behind the overlay and its own layouts push a StatusBar
  // entry as they go. The last entry to mount wins, not the last in the tree,
  // so on a dark device `home/_layout` turns the bar light on our gold field
  // after we have set it. Re-assert until the overlay leaves. The <StatusBar>
  // below is still what hands the bar back to the app on unmount.
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

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.field, fieldStyle]}>
      <View style={styles.fill}>
        <View style={styles.stage}>
          {COMPANIONS.map((companion) => (
            <PoppingCompanion
              key={`${companion.left}-${companion.top}`}
              {...companion}
              isStill={isStill}
            />
          ))}

          <View style={styles.hero}>
            <CrumpetMark
              size={HERO_SIZE}
              fill={SplashPalette.crumpet}
              holeFill={SplashPalette.crumpetHole}
            />
          </View>
        </View>
      </View>

      {/* Last child on purpose: the bar honours whichever entry mounted last,
          and gold is a light ground in both modes. */}
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
  },
  stage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE
  },
  hero: {
    position: 'absolute',
    left: (STAGE_SIZE - HERO_SIZE) / 2,
    top: (STAGE_SIZE - HERO_SIZE) / 2
  },
  companion: {
    position: 'absolute'
  },
  group: {
    flex: 1,
    // The crumpet rises from the surface. A centre origin grows it out of the air.
    transformOrigin: 'bottom'
  },
  head: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center'
  },
  disc: {
    position: 'absolute',
    bottom: 0
  }
});

export default AnimatedSplash;
