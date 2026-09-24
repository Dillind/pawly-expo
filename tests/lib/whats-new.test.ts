import type { Release } from '@/constants/release-notes';
import { formatReleaseDate, seedVersion, sheetNotes, unseenReleases } from '@/lib/whats-new';

const note = (title: string, isHighlighted = true) => ({
  icon: 'sparkles' as const,
  title,
  description: isHighlighted ? `${title} text` : undefined,
  isHighlighted
});

const RELEASES: Release[] = [
  { version: '1.0.3.1', date: '2026-10-20', notes: [note('OTA fix', false)] },
  { version: '1.0.3', date: '2026-10-14', notes: [note('C1'), note('C2')] },
  { version: '1.0.2', date: '2026-10-07', notes: [note('B1'), note('B fix', false)] },
  { version: '1.0.1', date: '2026-09-24', notes: [note('A1')] }
];

describe('unseenReleases', () => {
  it('returns every release newer than the last one seen', () => {
    expect(unseenReleases(RELEASES, '1.0.2').map((r) => r.version)).toEqual(['1.0.3.1', '1.0.3']);
  });

  it('returns nothing when the newest was seen', () => {
    expect(unseenReleases(RELEASES, '1.0.3.1')).toEqual([]);
  });
});

describe('sheetNotes', () => {
  it('collects highlighted notes across skipped releases, newest first, at most three', () => {
    expect(sheetNotes(RELEASES, '1.0.0').map((n) => n.title)).toEqual(['C1', 'C2', 'B1']);
  });

  it('shows nothing for a release with only plain notes', () => {
    expect(sheetNotes(RELEASES, '1.0.3')).toEqual([]);
  });
});

describe('seedVersion', () => {
  it('keeps a valid stored version', () => {
    expect(seedVersion('1.0.2', true, RELEASES)).toBe('1.0.2');
  });

  it('treats a signed-in user with no key as updating from before the key existed', () => {
    expect(seedVersion(null, true, RELEASES)).toBe('1.0.0');
  });

  it('treats a signed-out user with no key as a fresh install', () => {
    expect(seedVersion(null, false, RELEASES)).toBe('1.0.3.1');
  });

  it('treats an unreadable key as missing', () => {
    expect(seedVersion('garbage', false, RELEASES)).toBe('1.0.3.1');
  });
});

describe('formatReleaseDate', () => {
  it('formats the calendar date without shifting it', () => {
    expect(formatReleaseDate('2026-09-24')).toBe('24 Sep 2026');
  });
});
