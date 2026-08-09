export const SUPPORT_EMAIL = 'dylan.lindsay234@gmail.com';

export const SUPPORT_SUBJECT = 'Crumpet feedback / bug';

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
