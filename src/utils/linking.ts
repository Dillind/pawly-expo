import { Linking } from 'react-native';

/**
 * Opens a URL in the system browser. Returns whether it opened, so a caller can
 * tell the user when nothing happened -- a device with no mail client would
 * otherwise get silence.
 */
export const openExternalURL = async (url: string): Promise<boolean> => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      console.error(`Cannot open URL: ${url}`);
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Error opening URL:', error);
    return false;
  }
};
