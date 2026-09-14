import * as Haptics from 'expo-haptics';

import { isIOS } from '@/utils/platform';

const safe = async (fn: () => Promise<void>) => {
  if (!isIOS) return;
  try {
    await fn();
  } catch {}
};

export const hapticLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

// Not an impact: nothing collided, the selection changed.
export const hapticSelection = () => safe(() => Haptics.selectionAsync());

export const hapticMedium = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const hapticHeavy = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

export const hapticSuccess = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const hapticWarning = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const hapticError = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
