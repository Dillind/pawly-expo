import { Linking } from 'react-native';

import { logError } from '@/lib/errors';

// Opens a URL in the system browser. Returns whether it opened, so a caller can tell the user
// when nothing happened -- a device with no mail client would otherwise get silence.
export const openExternalURL = async (url: string): Promise<boolean> => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      logError(new Error(`Cannot open URL: ${url}`));
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
};

// Opens the dialler directly: `canOpenURL` reports false for `tel:` unless the
// scheme is listed in LSApplicationQueriesSchemes, and it is not.
export const callNumber = async (phone: string): Promise<boolean> => {
  try {
    await Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
    return true;
  } catch {
    return false;
  }
};
