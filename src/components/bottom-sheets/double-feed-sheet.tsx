import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  petName: string;
  onConfirm: () => void;
};

/**
 * Intercepts before the write, not after. The trigger is slot state alone --
 * CONTEXT.md defines a Double Feed as two feeds for effectively the same
 * slot, and warning on slot state reuses the matcher with no second rule to
 * drift from it.
 */
const DoubleFeedSheet = ({ sheetRef, petName, onConfirm }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']} title="Already fed?">
      <AppText size={14} color="textSecondary">
        Someone has already logged a feed for this slot. Log another one for {petName} anyway?
      </AppText>
      <View style={styles.actions}>
        <MainButton
          text="Feed anyway"
          onPress={() => {
            void sheetRef.current?.dismiss();
            onConfirm();
          }}
        />
        <MainButton
          text="Cancel"
          variant="text"
          onPress={() => {
            void sheetRef.current?.dismiss();
          }}
        />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    actions: {
      gap: spacing.two
    }
  });

export default DoubleFeedSheet;
