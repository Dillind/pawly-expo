import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdMember } from '@/types/core';
import { fullName } from '@/utils/members';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  member: HouseholdMember | undefined;
  onSetRole: (role: HouseholdMember['role']) => void;
  onRemove: () => void;
};

/** Owner-only. Never rendered for the signed-in member -- they leave instead. */
const MemberActionsSheet = ({ sheetRef, member, onSetRole, onRemove }: Props) => {
  const styles = useStyles(makeStyles);

  // The sheet is always mounted, even with no member: returning null here meant
  // the ref was still null on the first tap, so present() did nothing and the
  // row only worked the second time.
  const name = member ? fullName(member) || 'this member' : '';
  const isOwner = member?.role === 'owner';

  const setRole = (role: HouseholdMember['role']) => {
    void sheetRef.current?.dismiss().then(() => onSetRole(role));
  };

  const confirmRemove = () => {
    void sheetRef.current?.dismiss();

    Alert.alert(
      `Remove ${name}?`,
      'They lose access to this household. Feeds and posts they wrote stay.',
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        { text: 'Remove', style: 'destructive', onPress: onRemove }
      ]
    );
  };

  return (
    <BaseSheet sheetRef={sheetRef} title={name} detents={['auto']}>
      <View style={styles.rows}>
        {member && (
          <>
            <SheetRow
              icon={isOwner ? 'user' : 'shield'}
              label={isOwner ? 'Make a contributor' : 'Make an owner'}
              onPress={() => setRole(isOwner ? 'contributor' : 'owner')}
            />

            <SheetRow
              icon="close"
              label="Remove from household"
              isDestructive
              onPress={confirmRemove}
            />
          </>
        )}
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: { gap: spacing.two }
  });

export default MemberActionsSheet;
