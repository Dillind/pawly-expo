import type { IconName } from '@/constants/icon-map';

export type ReleaseNote = {
  icon: IconName;
  title: string;
  description?: string;
  isHighlighted?: boolean;
  featureRequestId?: string;
};

export type Release = {
  version: string;
  date: string;
  notes: ReleaseNote[];
};

// Newest first. The procedure for adding one is in AGENTS.md > Release notes.
export const RELEASES: Release[] = [
  {
    version: '1.0.1',
    date: '2026-09-24',
    notes: [
      {
        icon: 'users',
        title: 'Follow back',
        description: 'Confirm follow requests from Notifications, and follow the household back.',
        isHighlighted: true,
        featureRequestId: '583b8c30-fbf5-4094-ad14-37b3d2089b45'
      },
      {
        icon: 'sparkles',
        title: 'What’s New',
        description: 'See what changed each time Crumpet updates.',
        isHighlighted: true,
        featureRequestId: 'a6df2787-1bd8-48d2-8eb5-7f61e27fedae'
      }
    ]
  }
];
