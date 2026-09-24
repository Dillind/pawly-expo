import { RELEASES } from '@/constants/release-notes';
import { SHEET_NOTE_LIMIT } from '@/lib/whats-new';
import { compareVersions, parseVersion } from '@/utils/version';

import app from '../../app.json';

describe('RELEASES', () => {
  it('uses valid versions and dates', () => {
    for (const release of RELEASES) {
      expect(parseVersion(release.version)).not.toBeNull();
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('is strictly newest first', () => {
    for (let index = 1; index < RELEASES.length; index++) {
      expect(compareVersions(RELEASES[index - 1].version, RELEASES[index].version)).toBe(1);
    }
  });

  // A store build without its notes would ship the previous release as "new".
  it('starts with the version in app.json, or an over-the-air release on top of it', () => {
    const [major, minor, patch] = RELEASES[0].version.split('.');
    expect([major, minor, patch].join('.')).toBe(app.expo.version);
  });

  it('highlights at most what the sheet can show, and every highlight has a description', () => {
    for (const release of RELEASES) {
      const highlighted = release.notes.filter((note) => note.isHighlighted);
      expect(highlighted.length).toBeLessThanOrEqual(SHEET_NOTE_LIMIT);
      for (const note of highlighted) expect(note.description).toBeTruthy();
    }
  });
});
