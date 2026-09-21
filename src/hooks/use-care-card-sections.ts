import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';

// An owner edits a section in the tray; everyone else reads it in a sheet. The
// database refuses a contributor's write either way, so this is presentation.
export const useCareCardSections = (isOwner: boolean) => {
  const trayRef = useRef<TrueSheet | null>(null);
  const sheetRef = useRef<TrueSheet | null>(null);
  const [openSectionId, setOpenSectionId] = useState<string | undefined>(undefined);

  const openSection = (sectionId: string) => {
    setOpenSectionId(sectionId);
    void (isOwner ? trayRef : sheetRef).current?.present();
  };

  const closeSection = () => setOpenSectionId(undefined);

  return { trayRef, sheetRef, openSectionId, openSection, closeSection };
};
