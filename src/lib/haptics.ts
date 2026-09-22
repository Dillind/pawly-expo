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

export const hapticSuccess = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
