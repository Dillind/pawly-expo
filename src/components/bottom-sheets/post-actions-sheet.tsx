import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { Alert, StyleSheet } from 'react-native';

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

  // Await the dismissal. A route pushed while the sheet is still on screen is
  // swallowed by iOS -- the same clash the delete path below works around.
  const edit = () => {
    void sheetRef.current?.dismiss().then(onEdit);
  };

  const confirmDelete = () => {
    // Dismiss first: a native alert raised over a presented sheet is swallowed
    // by iOS, the same clash the popover rule describes.
    void sheetRef.current?.dismiss();

    Alert.alert('Delete this post?', 'This removes it for everyone in your household.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Delete', style: 'destructive', onPress: onDelete }
    ]);
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']}>
      {canEdit && (
        <PressableOpacity
          style={styles.row}
          onPress={edit}
          accessibilityRole="button"
          accessibilityLabel="Edit post">
          <Icon name="pencil" size={20} color="text" />
          <AppText size={16}>Edit post</AppText>
        </PressableOpacity>
      )}

      {canDelete && (
        <PressableOpacity
          style={styles.row}
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete post">
          <Icon name="trash" size={20} color="error" />
          <AppText size={16} color="error">
            Delete post
          </AppText>
        </PressableOpacity>
      )}
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.three
    }
  });

export default PostActionsSheet;
