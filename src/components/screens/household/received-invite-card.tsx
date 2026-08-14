import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import { Radius, type AppTheme } from '@/constants/theme';
import { useDeclineInvite, useRedeemInvite } from '@/hooks/queries/use-invites';
import { useStyles } from '@/hooks/use-styles';
import { roleWithArticle } from '@/utils/members';
import type { ReceivedInvite } from '@/services/invite.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  invite: ReceivedInvite;
  onAccepted?: () => void;
};

/**
 * The one actionable thing in the app that is not a tap-through: Accept and
 * Decline rather than a link to a subject. Used both on Join a household and,
 * once the inbox exists, as a row in it.
 */
const ReceivedInviteCard = ({ invite, onAccepted }: Props) => {
  const styles = useStyles(makeStyles);

  const { mutate: redeem, isPending: isJoining } = useRedeemInvite();
  const { mutate: decline, isPending: isDeclining } = useDeclineInvite();

  const isBusy = isJoining || isDeclining;
  const inviter = invite.invitedByName ?? 'Someone';

  return (
    <View style={styles.card}>
      <AppText size={16}>
        {inviter} invited you to {invite.householdName}
      </AppText>
      <AppText size={14} color="textSecondary">
        You&apos;d join as {roleWithArticle(invite.role)}.
      </AppText>

      <View style={styles.actions}>
        <MainButton
          text="Accept"
          isDisabled={isBusy}
          isLoading={isJoining}
          containerStyle={styles.action}
          onPress={() =>
            redeem({ inviteId: invite.id }, { onSuccess: () => onAccepted?.() })
          }
        />
        <MainButton
          text="Decline"
          variant="secondary"
          isDisabled={isBusy}
          containerStyle={styles.action}
          onPress={() => decline(invite.id)}
        />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      padding: spacing.four,
      gap: spacing.two
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.three,
      paddingTop: spacing.two
    },
    action: { flex: 1 }
  });

export default ReceivedInviteCard;
