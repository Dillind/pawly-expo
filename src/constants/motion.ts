import { Easing } from 'react-native-reanimated';

// Reanimated's default easing is inOut, which starts slowly. Anything the user
// waits on wants `Curve.out`.
export const Duration = {
  press: 100,
  exit: 140,
  quick: 160,
  enter: 180,
  reflow: 220,
  slide: 260
} as const;

// The one place Reanimated's `Easing` is imported.
export const Curve = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  overshoot: Easing.bezier(0.34, 1.56, 0.64, 1)
} as const;
