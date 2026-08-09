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
  onDelete: () => void;
};

/**
 * One row, deliberately.
 *
 * There is no edit in v1 -- delete and repost. Editing needs an `edited_at` and
 * a marker on the card, so that comments (deferred, not cancelled) cannot be
 * made nonsense by a later rewrite. Worth building once, with comments.
 *
 * The sheet is only rendered for someone who can act, so it never contains a
 * disabled row.
 */
const PostActionsSheet = ({ sheetRef, onDelete }: Props) => {
  const styles = useStyles(makeStyles);

  const confirmDelete = () => {
    // Dismiss first: a native alert raised over a presented sheet is swallowed
    // by iOS, the same clash the popover rule describes.
    void sheetRef.current?.dismiss();

    Alert.alert('Delete this post?', 'The photo will be removed for everyone in your household.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Delete', style: 'destructive', onPress: onDelete }
    ]);
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']}>
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
