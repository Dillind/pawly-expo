import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

/** For a link inside a sentence, where a `Link` component cannot go. */
export async function openExternalUrl(url: string) {
  if (process.env.EXPO_OS === 'web') {
    globalThis.open?.(url, '_blank');
    return;
  }

  await openBrowserAsync(url, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
}

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          // Otherwise the href opens in the system browser and leaves the app.
          event.preventDefault();
          await openExternalUrl(href);
        }
      }}
    />
  );
}
