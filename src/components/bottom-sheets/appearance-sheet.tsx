import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { APPEARANCE_OPTIONS } from '@/constants/options';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useThemeStore } from '@/stores/theme-store';
import type { ThemePreference } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
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
      <View style={styles.list}>
        {APPEARANCE_OPTIONS.map((option) => (
          <PressableOpacity
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: preference === option.value }}
            style={styles.row}
            onPress={() => handleSelect(option.value)}>
            <AppText size={16} style={styles.label}>
              {option.label}
            </AppText>
            {preference === option.value && <Icon name="check" size={18} color="primary" />}
          </PressableOpacity>
        ))}
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    list: {
      backgroundColor: colors.backgroundSheetRow,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.three
    },
    label: {
      flex: 1
    }
  });

export default AppearanceSheet;
