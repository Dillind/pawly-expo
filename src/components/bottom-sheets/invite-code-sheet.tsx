import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import InviteCodeCard from '@/components/screens/household/invite-code-card';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PendingInvite } from '@/services/invite.service';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  invite: PendingInvite | undefined;
  householdName: string;
  onRevoke: () => void;
};

/**
 * An invite's code after the moment it was created. It used to live only in
 * the state of the screen that made it, so leaving that screen lost the one
 * thing the invitee needs.
 */
const InviteCodeSheet = ({ sheetRef, invite, householdName, onRevoke }: Props) => {
  const styles = useStyles(makeStyles);

  const revoke = () => {
    void sheetRef.current?.dismiss().then(onRevoke);
  };

  return (
    <BaseSheet sheetRef={sheetRef} title={invite?.email ?? ''} detents={['auto']}>
      {/* Guards the content, never the sheet: a sheet that renders null until
          its data lands has no ref to present on the first tap. */}
      {invite && (
        <View style={styles.body}>
          <InviteCodeCard code={invite.code} householdName={householdName} />

          <SheetRow icon="trash" label="Revoke invite" isDestructive onPress={revoke} />
        </View>
      )}
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    body: {
      gap: spacing.four
    }
  });

export default InviteCodeSheet;
