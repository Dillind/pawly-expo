import {
  SUPPORT_EMAIL,
  buildSupportBody,
  buildSupportMailto,
  type SupportContext
} from '@/lib/support';

const context: SupportContext = {
  version: '1.0.0',
  device: 'iPhone 17 Pro',
  osVersion: '26.0',
  userId: 'ab12'
};

describe('buildSupportBody', () => {
  it('puts the marker above the diagnostics, so anything typed lands above it', () => {
    const lines = buildSupportBody(context).split('\n');
    const markerIndex = lines.findIndex((line) => line.includes('please write above this line'));

    expect(markerIndex).toBeGreaterThan(0);
    expect(lines.slice(0, markerIndex).every((line) => line === '')).toBe(true);
    expect(lines.slice(markerIndex).join('\n')).toContain('App version: 1.0.0');
  });

  it('names a signed-out user rather than printing undefined', () => {
    expect(buildSupportBody({ ...context, userId: undefined })).toContain('User: signed out');
  });
});

describe('buildSupportMailto', () => {
  it('addresses support and percent-encodes the subject and body', () => {
    const url = buildSupportMailto(context);

    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(url).toContain('subject=Crumpet%20feedback%20%2F%20bug');
    expect(url).not.toContain('\n');
    expect(decodeURIComponent(url.split('&body=')[1])).toBe(buildSupportBody(context));
  });
});
