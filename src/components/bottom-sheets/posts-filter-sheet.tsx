import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import Icon from '@/components/core/icon';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostsScope } from '@/stores/posts-scope-store';

const CREST = 26;

export type FilterHousehold = { id: string; name: string; isFollowed: boolean };

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  scope: PostsScope;
  households: FilterHousehold[];
  hasFollowed: boolean;
  onSelect: (scope: PostsScope) => void;
};

/**
 * Two doors, not a segmented control: a native header may not carry a glass
 * segmented control beside a bar button, and the second half of the list is a
 * household picker that a control of three cells cannot hold.
 */
const PostsFilterSheet = ({ sheetRef, scope, households, hasFollowed, onSelect }: Props) => {
  const styles = useStyles(makeStyles);

  const choose = (next: PostsScope) => {
    onSelect(next);
    void sheetRef.current?.dismiss();
  };

  // 'auto' alone: `scrollable` makes the content fill its detent, and this
  // sheet is three rows plus however many households a person is in.
  return (
    <BaseSheet sheetRef={sheetRef} title="Show" detents={['auto']}>
      <View style={styles.rows}>
        <SheetRow
          icon="grid"
          label="Everything"
          isSelected={scope.kind === 'all'}
          onPress={() => choose({ kind: 'all' })}
        />
        <SheetRow
          icon="users"
          label="My households"
          isSelected={scope.kind === 'mine'}
          onPress={() => choose({ kind: 'mine' })}
        />
        {hasFollowed && (
          <SheetRow
            icon="eye"
            label="Following"
            isSelected={scope.kind === 'following'}
            onPress={() => choose({ kind: 'following' })}
          />
        )}
      </View>

      {households.length > 1 && (
        <>
          <Divider />
          <AppText size={13} color="textSecondary" style={styles.groupLabel}>
            One household
          </AppText>
          <View style={styles.rows}>
            {households.map((household) => (
              <SheetRow
                key={household.id}
                leading={
                  <View style={styles.crest}>
                    <Icon name="pawPrint" size={14} color="textSecondary" />
                  </View>
                }
                label={household.name}
                detail={household.isFollowed ? 'Following' : undefined}
                isSelected={scope.kind === 'household' && scope.householdId === household.id}
                onPress={() => choose({ kind: 'household', householdId: household.id })}
              />
            ))}
          </View>
        </>
      )}
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    rows: {
      gap: spacing.two
    },
    // A household row is named, so it takes a crest rather than a glyph -- the
    // three scope rows above it are the ones an icon has to distinguish.
    crest: {
      width: CREST,
      height: CREST,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElement
    },
    groupLabel: {
      paddingHorizontal: spacing.one,
      paddingTop: spacing.two
    }
  });

export default PostsFilterSheet;
