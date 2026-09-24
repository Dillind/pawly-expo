import { RELEASES } from '@/constants/release-notes';
import { sheetNotes, unseenReleases } from '@/lib/whats-new';
import { useWhatsNewStore } from '@/stores/whats-new-store';

export const useWhatsNew = () => {
  const { lastSeenVersion, hasHydrated, markSeen } = useWhatsNewStore();

  return {
    hasHydrated,
    lastSeenVersion,
    hasUnseen: hasHydrated && unseenReleases(RELEASES, lastSeenVersion).length > 0,
    notes: hasHydrated ? sheetNotes(RELEASES, lastSeenVersion) : [],
    markSeen
  };
};
