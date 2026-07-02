import { isIOS } from '@/utils/platform';
import * as Haptics from 'expo-haptics';

const safe = async (fn: () => Promise<void>) => {
  if (!isIOS) return;
  try {
    await fn();
  } catch {
    // Ignore haptic errors (unsupported devices, etc.)
  }
};

/**
 * Light haptic for button presses and selections
 */
export const hapticLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/**
 * Medium haptic for significant actions like swiping
 */
export const hapticMedium = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/**
 * Heavy haptic for important confirmations
 */
export const hapticHeavy = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

/**
 * Success notification for positive feedback
 */
export const hapticSuccess = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/**
 * Warning notification
 */
export const hapticWarning = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/**
 * Error notification
 */
export const hapticError = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
