import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  CardAspectRatio,
  CardMaxWidth,
  CardPalette,
  CardRadius
} from '@/constants/care-card-palette';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { createShadowLarge } from '@/lib/styles/shadows';

const FLIP_MS = 420;
const REDUCED_MS = 180;
// Below about 700 the near edge of the turning card distorts.
const PERSPECTIVE = 820;
const LIFT_SCALE = 1.06;
const ENTER_SCALE = 0.92;
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

type Props = {
  isFlipped: boolean;
  front: ReactNode;
  back: ReactNode;
};

// `backfaceVisibility` alone has been unreliable on Fabric, so each face is also
// switched at the halfway point -- the card reads correctly where it is ignored.
const FlipCard = ({ isFlipped, front, back }: Props) => {
  const { colors } = useTheme();
  const isReduced = useReducedMotion();
  const progress = useSharedValue(isFlipped ? 1 : 0);
  const enter = useSharedValue(isReduced ? 1 : ENTER_SCALE);

  useEffect(() => {
    enter.set(withSpring(1, { duration: 400, dampingRatio: 0.85 }));
  }, [enter]);

  useEffect(() => {
    progress.set(
      withTiming(isFlipped ? 1 : 0, {
        duration: isReduced ? REDUCED_MS : FLIP_MS,
        easing: EASE_IN_OUT
      })
    );
  }, [isFlipped, isReduced, progress]);

  useAnimatedReaction(
    () => (progress.get() > 0.5 ? 1 : 0),
    (turned, previous) => {
      if (previous !== null && turned !== previous) scheduleOnRN(hapticLight);
    }
  );

  const liftStyle = useAnimatedStyle(() => {
    if (isReduced) return { transform: [{ scale: enter.get() }] };
    return {
      transform: [
        { perspective: PERSPECTIVE },
        { scale: enter.get() * interpolate(progress.get(), [0, 0.5, 1], [1, LIFT_SCALE, 1]) }
      ]
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    const isHidden = progress.get() > 0.5;
    if (isReduced) return { opacity: 1 - progress.get(), zIndex: isHidden ? 0 : 1 };
    const base = { opacity: isHidden ? 0 : 1, zIndex: isHidden ? 0 : 1 };
    return {
      ...base,
      transform: [{ perspective: PERSPECTIVE }, { rotateY: `${progress.get() * 180}deg` }]
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const isHidden = progress.get() <= 0.5;
    if (isReduced) return { opacity: progress.get(), zIndex: isHidden ? 0 : 1 };
    const base = { opacity: isHidden ? 0 : 1, zIndex: isHidden ? 0 : 1 };
    return {
      ...base,
      transform: [{ perspective: PERSPECTIVE }, { rotateY: `${progress.get() * 180 - 180}deg` }]
    };
  });

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.card, createShadowLarge(colors), styles.cardShadow, liftStyle]}>
        <Animated.View
          style={[styles.face, frontStyle]}
          pointerEvents={isFlipped ? 'none' : 'auto'}>
          {front}
        </Animated.View>

        <Animated.View style={[styles.face, backStyle]} pointerEvents={isFlipped ? 'auto' : 'none'}>
          {back}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    alignSelf: 'stretch',
    alignItems: 'center'
  },
  card: {
    width: '100%',
    maxWidth: CardMaxWidth,
    aspectRatio: CardAspectRatio,
    borderRadius: CardRadius,
    borderCurve: 'continuous'
  },
  // The shadow sits on the wrapper, never on a face: a rotating view cannot
  // carry one, and `overflow: hidden` on the face would clip it anyway.
  cardShadow: {
    shadowColor: CardPalette.onGold,
    shadowOpacity: 0.34,
    shadowRadius: 34
  },
  face: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backfaceVisibility: 'hidden'
  }
});

export default FlipCard;
