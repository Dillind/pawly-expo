import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
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
 *
 * A waiting invite is deliberately not surfaced here. Joining a household is
 * something the invitee starts — by scanning the QR or entering the code —
 * never something the app puts in front of them. The record of an invite
 * belongs in the notification inbox (#19).
 */
const NoHouseholdState = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

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
