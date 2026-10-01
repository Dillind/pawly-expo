import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import type { ComponentType } from 'react';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const environment =
  (Constants.expoConfig?.extra?.sentryEnvironment as string | undefined) ?? 'development';

const isSentryEnabled = Boolean(dsn);

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
    sendDefaultPii: false
  });
}

export function reportError(error: unknown) {
  if (isSentryEnabled) Sentry.captureException(error);
}

export function wrapWithSentry<P extends Record<string, unknown>>(
  component: ComponentType<P>
): ComponentType<P> {
  return isSentryEnabled ? Sentry.wrap(component) : component;
}
