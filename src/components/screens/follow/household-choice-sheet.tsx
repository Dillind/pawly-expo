import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import HouseholdCrest from '@/components/core/household-crest';
import MainButton from '@/components/core/main-button';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

export type HouseholdChoice = {
  id: string;
  name: string;
  detail?: string;
  // A state to show instead of a checkbox, e.g. "Following".
  lockedLabel?: string;
};

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  title: string;
  description: string;
  footnote?: string;
  choices: HouseholdChoice[];
  initialIds: string[];
  confirmText: string;
  // An empty choice is allowed only when the flow has a meaning for it.
  allowsNone?: boolean;
  onConfirm: (ids: string[]) => void;
};

const CREST = 32;

const HouseholdChoiceSheet = ({
  sheetRef,
  title,
  description,
  footnote,
  choices,
  initialIds,
  confirmText,
  allowsNone = false,
  onConfirm
}: Props) => {
  const styles = useStyles(makeStyles);
  const [selectedIds, setSelectedIds] = useState(initialIds);

  const toggle = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const confirm = () => {
    onConfirm(selectedIds);
    void sheetRef.current?.dismiss();
  };

  return (
    <BaseSheet
      sheetRef={sheetRef}
      title={title}
      detents={['auto']}
      onPresent={() => setSelectedIds(initialIds)}>
      <AppText size="subhead" color="textSecondary">
        {description}
      </AppText>

      <View style={styles.rows}>
        {choices.map((choice) => (
          <SheetRow
            key={choice.id}
            label={choice.name}
            detail={choice.lockedLabel ?? choice.detail}
            leading={<HouseholdCrest size={CREST} iconSize={16} />}
            isSelected={!choice.lockedLabel && selectedIds.includes(choice.id)}
            isCheckbox={!choice.lockedLabel}
            onPress={() => {
              if (!choice.lockedLabel) toggle(choice.id);
            }}
          />
        ))}
      </View>

      {footnote && (
        <AppText size="footnote" color="textSecondary">
          {footnote}
        </AppText>
      )}

      <MainButton
        text={confirmText}
        isDisabled={!allowsNone && selectedIds.length === 0}
        onPress={confirm}
      />
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: {
      gap: spacing.two
    }
  });

export default HouseholdChoiceSheet;
