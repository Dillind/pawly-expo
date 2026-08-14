import OptionSheet from '@/components/bottom-sheets/option-sheet';
import type { IconName } from '@/constants/icon-map';
import { APPEARANCE_OPTIONS } from '@/constants/options';
import { useThemeStore } from '@/stores/theme-store';
import type { ThemePreference } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

const APPEARANCE_ICONS: Record<ThemePreference, IconName> = {
  system: 'sunMoon',
  light: 'sun',
  dark: 'moon'
};

const AppearanceSheet = ({ sheetRef }: Props) => {
  const { preference, setPreference } = useThemeStore();

  return (
    <OptionSheet
      sheetRef={sheetRef}
      title="Appearance"
      options={APPEARANCE_OPTIONS}
      selected={preference}
      iconFor={(value) => APPEARANCE_ICONS[value]}
      onSelect={(value) => void setPreference(value)}
    />
  );
};

export default AppearanceSheet;
