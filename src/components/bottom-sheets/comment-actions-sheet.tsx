import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  onDelete: () => void;
};

/**
 * One row today. It is a sheet rather than a bare alert because the long press
 * that raises it is imprecise -- the sheet names which action is on offer
 * before anything destructive is confirmed.
 */
const CommentActionsSheet = ({ sheetRef, onDelete }: Props) => {
  const styles = useStyles(makeStyles);

  // Dismiss first, then confirm. A native alert raised while the sheet is still
  // up gets swallowed by iOS.
  const confirmDelete = () => {
    void sheetRef.current?.dismiss().then(onDelete);
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']}>
      <View style={styles.rows}>
        <SheetRow icon="trash" label="Delete comment" isDestructive onPress={confirmDelete} />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: {
      gap: spacing.two
    }
  });

export default CommentActionsSheet;
