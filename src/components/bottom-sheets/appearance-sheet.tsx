import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import type { IconName } from '@/constants/icon-map';
import { APPEARANCE_OPTIONS } from '@/constants/options';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useThemeStore } from '@/stores/theme-store';
import type { ThemePreference } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

const APPEARANCE_ICONS: Record<ThemePreference, IconName> = {
  system: 'sunMoon',
  light: 'sun',
  dark: 'moon'
};

const AppearanceSheet = ({ sheetRef }: Props) => {
  const styles = useStyles(makeStyles);
  const { preference, setPreference } = useThemeStore();

  const handleSelect = (next: ThemePreference) => {
    void setPreference(next);
    void sheetRef.current?.dismiss();
  };

  return (
    <BaseSheet sheetRef={sheetRef} title="Appearance" detents={['auto']}>
      <View style={styles.rows}>
        {APPEARANCE_OPTIONS.map((option) => (
          <SheetRow
            key={option.value}
            icon={APPEARANCE_ICONS[option.value]}
            label={option.label}
            isSelected={preference === option.value}
            onPress={() => handleSelect(option.value)}
          />
        ))}
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: { gap: spacing.two }
  });

export default AppearanceSheet;
