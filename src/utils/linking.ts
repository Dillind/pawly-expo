import { Linking } from 'react-native';

/**
 * Opens a URL in the system browser.
 * Checks canOpenURL first to give a meaningful error if the URL is unsupported.
 */
export const openExternalURL = async (url: string): Promise<void> => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      console.warn(`Cannot open URL: ${url}`);
      return;
    }
    await Linking.openURL(url);
  } catch (error) {
    console.error('Error opening URL:', error);
  }
};
