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

  // Always mounted, even with no member: the ref has to exist before the row
  // that opens it is tapped.
  const name = member ? fullName(member) || 'this member' : '';
  const isOwner = member?.role === 'owner';

  const setRole = (role: HouseholdMember['role']) => {
    void sheetRef.current?.dismiss().then(() => onSetRole(role));
  };

  // Promotion asks, demotion does not: an owner can remove the person who
  // promoted them, so this is the only one of the two that can cost you
  // something you cannot take back yourself.
  const confirmPromote = () => {
    void sheetRef.current?.dismiss();

    Alert.alert(
      `Make ${name} an owner?`,
      'Owners can add and remove pets, and remove any member — including you.',
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        { text: 'Make an owner', onPress: () => onSetRole('owner') }
      ]
    );
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
              onPress={() => (isOwner ? setRole('contributor') : confirmPromote())}
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
    rows: {
      gap: spacing.two
    }
  });

export default MemberActionsSheet;
