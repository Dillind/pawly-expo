import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * The sheet is only rendered for someone who can act, and never contains a
 * disabled row -- so an Owner looking at a member's post sees delete alone.
 */
const PostActionsSheet = ({ sheetRef, canEdit, canDelete, onEdit, onDelete }: Props) => {
  const styles = useStyles(makeStyles);

  const edit = () => {
    void sheetRef.current?.dismiss().then(onEdit);
  };

  const confirmDelete = () => {
    void sheetRef.current?.dismiss();

    Alert.alert('Delete this post?', 'This removes it for everyone in your household.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Delete', style: 'destructive', onPress: onDelete }
    ]);
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']}>
      <View style={styles.rows}>
        {canEdit && <SheetRow icon="pencil" label="Edit post" onPress={edit} />}

        {canDelete && (
          <SheetRow icon="trash" label="Delete post" isDestructive onPress={confirmDelete} />
        )}
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

export default PostActionsSheet;
