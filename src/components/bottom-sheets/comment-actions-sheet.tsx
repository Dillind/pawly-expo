import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  onDelete: () => void;
};

const CommentActionsSheet = ({ sheetRef, onDelete }: Props) => {
  const styles = useStyles(makeStyles);

  // iOS swallows an alert raised while the sheet is still up.
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
