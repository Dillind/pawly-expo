import { Easing } from 'react-native-reanimated';

/**
 * Motion tokens, the same kind of system as Spacing and Radius: pick the token
 * that names the moment rather than a new number.
 *
 * Reanimated's own default easing is inOut, which starts slowly. Anything the
 * user is waiting on wants `Curve.out`.
 */
export const Duration = {
  /** A press answering a finger. */
  press: 100,
  /** Something leaving. Always shorter than the thing arriving. */
  exit: 140,
  /** A small element arriving, or a label swapping. */
  quick: 160,
  /** A panel or body fading in. */
  enter: 180,
  /** A list or card re-laying itself out. */
  reflow: 220,
  /** An indicator travelling across a track. */
  slide: 260
} as const;

/** The one place Reanimated's `Easing` is imported, so the curves stay shared. */
export const Curve = {
  /** Strong ease-out. The default for anything entering or leaving. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** Overshoot, for a confirmation that should feel physical. */
  overshoot: Easing.bezier(0.34, 1.56, 0.64, 1)
} as const;
