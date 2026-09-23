import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

export async function openExternalUrl(url: string) {
  if (process.env.EXPO_OS === 'web') {
    globalThis.open?.(url, '_blank');
    return;
  }

  await openBrowserAsync(url, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
}
