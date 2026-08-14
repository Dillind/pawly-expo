import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Option } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props<T extends string> = {
  sheetRef: RefObject<TrueSheet | null>;
  title: string;
  options: Option<T>[];
  selected: T | undefined;
  onSelect: (value: T) => void;
  /** Optional per-option glyph. Omit for a plain list. */
  iconFor?: (value: T) => IconName;
  /** Long lists need to scroll; a handful of options should size to content. */
  isScrollable?: boolean;
};

/** Pick one of a fixed set. Dismisses itself on selection. */
const OptionSheet = <T extends string>({
  sheetRef,
  title,
  options,
  selected,
  onSelect,
  iconFor,
  isScrollable = false
}: Props<T>) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet
      sheetRef={sheetRef}
      title={title}
      detents={isScrollable ? ['auto', 0.6, 1] : ['auto']}
      scrollable={isScrollable}>
      <View style={styles.rows}>
        {options.map((option) => (
          <SheetRow
            key={option.value}
            label={option.label}
            icon={iconFor?.(option.value)}
            isSelected={selected === option.value}
            onPress={() => {
              onSelect(option.value);
              void sheetRef.current?.dismiss();
            }}
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

export default OptionSheet;
