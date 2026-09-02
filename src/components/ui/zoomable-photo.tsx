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

/** How far the image may travel before its own edge would leave the frame. */
const travelLimit = (scale: number, size: number) => {
  'worklet';
  return Math.max(0, ((scale - 1) * size) / 2);
};

const clamp = (value: number, limit: number) => {
  'worklet';
  return Math.min(limit, Math.max(-limit, value));
};

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
  // The dismiss drag owns its own offset. Sharing `y` with the zoomed pan let
  // whichever gesture ran first discard the other's position.
  const dismissY = useSharedValue(0);

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
    dismissY.set(withSpring(0, SETTLE));
    dismissProgress.set(withSpring(0, SETTLE));
    scheduleOnRN(reportZoom, false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const base = savedScale.get();
      const next = Math.min(MAX_SCALE, base * event.scale);
      const growth = next / base;

      // Hold the point between the fingers still. Without this the image
      // scales about its centre and a pinched corner runs off the screen.
      const offsetX = event.focalX - width / 2 - savedX.get();
      const offsetY = event.focalY - height / 2 - savedY.get();

      scale.set(next);
      x.set(clamp(event.focalX - width / 2 - growth * offsetX, travelLimit(next, width)));
      y.set(clamp(event.focalY - height / 2 - growth * offsetY, travelLimit(next, height)));
    })
    .onEnd(() => {
      if (scale.get() <= 1) {
        reset();
        return;
      }

      savedScale.set(scale.get());
      savedX.set(x.get());
      savedY.set(y.get());
      scheduleOnRN(reportZoom, true);
    });

  // Panning the image itself. Only live while zoomed -- at rest the vertical
  // pan below owns the finger, and the horizontal axis belongs to the pager.
  const panZoomed = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate((event) => {
      const current = scale.get();
      x.set(clamp(savedX.get() + event.translationX, travelLimit(current, width)));
      y.set(clamp(savedY.get() + event.translationY, travelLimit(current, height)));
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
      dismissY.set(event.translationY);
      dismissProgress.set(Math.min(1, Math.max(0, event.translationY) / DISMISS_DISTANCE));
    })
    .onEnd((event) => {
      const isFlick = event.velocityY > DISMISS_VELOCITY;

      if (isFlick || event.translationY > DISMISS_DISTANCE) {
        scheduleOnRN(onDismiss);
        return;
      }

      dismissY.set(withSpring(0, { ...SETTLE, velocity: event.velocityY }));
      dismissProgress.set(withSpring(0, SETTLE));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd((event) => {
      if (scale.get() > 1) {
        reset();
        return;
      }

      // Zoom towards the tap, not towards the middle of the frame.
      const targetX = clamp(
        (event.x - width / 2) * (1 - DOUBLE_TAP_SCALE),
        travelLimit(DOUBLE_TAP_SCALE, width)
      );
      const targetY = clamp(
        (event.y - height / 2) * (1 - DOUBLE_TAP_SCALE),
        travelLimit(DOUBLE_TAP_SCALE, height)
      );

      scale.set(withSpring(DOUBLE_TAP_SCALE, SETTLE));
      savedScale.set(DOUBLE_TAP_SCALE);
      x.set(withSpring(targetX, SETTLE));
      y.set(withSpring(targetY, SETTLE));
      savedX.set(targetX);
      savedY.set(targetY);
      scheduleOnRN(reportZoom, true);
    });

  const gesture = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, panZoomed, panDismiss)
  );

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() + dismissY.get() },
      { scale: scale.get() }
    ]
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
