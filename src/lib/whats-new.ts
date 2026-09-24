import dayjs from 'dayjs';

import type { Release, ReleaseNote } from '@/constants/release-notes';
import { isNewerVersion, parseVersion } from '@/utils/version';

export const SHEET_NOTE_LIMIT = 3;
export const BASELINE_VERSION = '1.0.0';

export const latestVersion = (releases: Release[]) => releases[0]?.version ?? BASELINE_VERSION;

export const unseenReleases = (releases: Release[], lastSeen: string) =>
  releases.filter((release) => isNewerVersion(release.version, lastSeen));

export const sheetNotes = (releases: Release[], lastSeen: string): ReleaseNote[] =>
  unseenReleases(releases, lastSeen)
    .flatMap((release) => release.notes.filter((note) => note.isHighlighted))
    .slice(0, SHEET_NOTE_LIMIT);

// A missing key cannot tell a fresh install from someone updating from a build
// that predates the key. A restored session can: a fresh install has none yet.
export const seedVersion = (
  stored: string | null,
  isSignedIn: boolean,
  releases: Release[]
): string => {
  if (stored && parseVersion(stored)) return stored;
  return isSignedIn ? BASELINE_VERSION : latestVersion(releases);
};

export const formatReleaseDate = (date: string) => dayjs(date).format('D MMM YYYY');
