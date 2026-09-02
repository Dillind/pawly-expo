import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue
} from 'react-native-reanimated';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';
import { scheduleOnRN } from 'react-native-worklets';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/** How far a downward flick must travel, or how fast, before it closes. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

const SETTLE = { duration: 300, dampingRatio: 0.85, reduceMotion: ReduceMotion.System };

type Props = {
  url: string;
  accessibilityLabel: string;
  /** 0 at rest, 1 when the drag has travelled far enough to close. */
  dismissProgress: SharedValue<number>;
  /** Paging must stop while a photo is zoomed, or a pan would change photos. */
  onZoomChange: (isZoomed: boolean) => void;
  onDismiss: () => void;
};

const ZoomablePhoto = ({
  url,
  accessibilityLabel,
  dismissProgress,
  onZoomChange,
  onDismiss
}: Props) => {
  const { width, height } = useWindowDimensions();
  const [isZoomed, setIsZoomed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reportZoom = (next: boolean) => {
    setIsZoomed(next);
    onZoomChange(next);
  };

  const reset = () => {
    'worklet';
    scale.set(withSpring(1, SETTLE));
    savedScale.set(1);
    x.set(withSpring(0, SETTLE));
    y.set(withSpring(0, SETTLE));
    savedX.set(0);
    savedY.set(0);
    scheduleOnRN(reportZoom, false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.set(Math.min(MAX_SCALE, savedScale.get() * event.scale));
    })
    .onEnd(() => {
      if (scale.get() <= 1) {
        reset();
        return;
      }

      savedScale.set(scale.get());
      scheduleOnRN(reportZoom, true);
    });

  // Panning the image itself. Only live while zoomed -- at rest the vertical
  // pan below owns the finger, and the horizontal axis belongs to the pager.
  const panZoomed = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate((event) => {
      x.set(savedX.get() + event.translationX);
      y.set(savedY.get() + event.translationY);
    })
    .onEnd(() => {
      savedX.set(x.get());
      savedY.set(y.get());
    });

  // Drag down to close. Vertical intent only, so a horizontal drag still pages
  // between photos rather than half-closing the viewer.
  const panDismiss = Gesture.Pan()
    .enabled(!isZoomed)
    .activeOffsetY([-16, 16])
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      y.set(event.translationY);
      dismissProgress.set(Math.min(1, Math.abs(event.translationY) / DISMISS_DISTANCE));
    })
    .onEnd((event) => {
      const isFlick = event.velocityY > DISMISS_VELOCITY;

      if (isFlick || Math.abs(event.translationY) > DISMISS_DISTANCE) {
        scheduleOnRN(onDismiss);
        return;
      }

      y.set(withSpring(0, { ...SETTLE, velocity: event.velocityY }));
      dismissProgress.set(withSpring(0, SETTLE));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      if (scale.get() > 1) {
        reset();
        return;
      }

      scale.set(withSpring(DOUBLE_TAP_SCALE, SETTLE));
      savedScale.set(DOUBLE_TAP_SCALE);
      scheduleOnRN(reportZoom, true);
    });

  const gesture = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, panZoomed, panDismiss)
  );

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }]
  }));

  return (
    <View style={{ width, height }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.stage, photoStyle]}>
          <Image
            source={url}
            style={styles.photo}
            contentFit="contain"
            transition={150}
            accessibilityLabel={accessibilityLabel}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    flex: 1
  },
  photo: {
    flex: 1
  }
});

export default ZoomablePhoto;
