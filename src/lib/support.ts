import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** Overridable so the address is not baked into the bundle once support is not a personal inbox. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'dylan.lindsay234@gmail.com';

export const SUPPORT_SUBJECT = 'Crumpet feedback / bug';

export const APP_VERSION = Constants.expoConfig?.version ?? '—';

const WRITE_ABOVE_MARKER = '--- please write above this line ---';

export type SupportContext = {
  version: string;
  device: string;
  osVersion: string;
  userId: string | undefined;
};

export function buildSupportBody(context: SupportContext): string {
  return [
    '',
    '',
    WRITE_ABOVE_MARKER,
    `App version: ${context.version}`,
    `Device: ${context.device}`,
    `OS: ${context.osVersion}`,
    `User: ${context.userId ?? 'signed out'}`
  ].join('\n');
}

export function buildSupportMailto(context: SupportContext): string {
  const subject = encodeURIComponent(SUPPORT_SUBJECT);
  const body = encodeURIComponent(buildSupportBody(context));

  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

/** Reads the device facts itself so call sites pass only what they know. */
export function supportMailtoForUser(userId: string | undefined): string {
  return buildSupportMailto({
    version: APP_VERSION,
    device: Device.modelName ?? 'unknown',
    osVersion: String(Platform.Version),
    userId
  });
}
