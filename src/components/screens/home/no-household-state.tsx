import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import ReceivedInviteCard from '@/components/screens/household/received-invite-card';
import type { AppTheme } from '@/constants/theme';
import { useReceivedInvites } from '@/hooks/queries/use-invites';
import { useStyles } from '@/hooks/use-styles';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/**
 * Home for someone who belongs to no household. This is the whole of
 * onboarding now — two doors on a screen you can leave, rather than a wizard
 * that holds you until you create a pet.
 *
 * Zero households is a valid, permanent state. A sitter or dog walker has no
 * pets of their own and never will, so this must not nag.
 */
const NoHouseholdState = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: invites = [] } = useReceivedInvites();

  // A waiting invite outranks the neutral fork. It is what stops two people
  // who share a pet ending up with two households: if the invite arrives
  // before the pet does, they join instead of creating.
  if (invites.length > 0) {
    return (
      <View style={styles.container}>
        <AppText variant="header" size={24}>
          You&apos;ve been invited
        </AppText>

        {invites.map((invite) => (
          <ReceivedInviteCard key={invite.id} invite={invite} />
        ))}

        <MainButton
          text="No thanks, add my own pet"
          variant="secondary"
          href="/home/add-pet"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppText variant="header" size={24}>
        No pets yet
      </AppText>
      <AppText size={15} color="textSecondary">
        Add a pet to start tracking feeds, or join a household someone has invited you to.
      </AppText>

      <View style={styles.door}>
        <MainButton text="Add a pet" href="/home/add-pet" />
        <AppText size={13} color="textSecondary">
          This creates a household you own. You can invite others to it later.
        </AppText>
      </View>

      <View style={styles.door}>
        <MainButton
          text="Join a household"
          variant="secondary"
          onPress={() => router.push('/home/join-household')}
        />
        <AppText size={13} color="textSecondary">
          You&apos;ll see that household&apos;s pets, feeds and posts. You won&apos;t need to add a
          pet of your own.
        </AppText>
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.four, paddingTop: spacing.four },
    door: { gap: spacing.two }
  });

export default NoHouseholdState;
