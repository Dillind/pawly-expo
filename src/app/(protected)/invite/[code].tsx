import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import ScreenView from '@/components/layout/screen-view';
import { ErrorMessage } from '@/constants/enums';
import type { AppTheme } from '@/constants/theme';
import { useInvitePreview, useRedeemInvite } from '@/hooks/queries/household/use-invites';
import { useStyles } from '@/hooks/use-styles';
import { roleWithArticle } from '@/utils/members';
import type { PreviewStatus } from '@/services/invite.service';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const REFUSALS: Partial<Record<PreviewStatus, string>> = {
  // The scanner's wording, not the inviter's -- InviteAlreadyMember reads
  // "They are already in this household", which is the owner's side of it.
  already_member: ErrorMessage.InviteAlreadyJoined,
  already_used: ErrorMessage.InviteAlreadyUsed,
  expired: ErrorMessage.InviteExpired,
  revoked: ErrorMessage.InviteWasRevoked,
  not_found: ErrorMessage.InviteNotFound
};

/**
 * Where a scanned QR lands: crumpetapp://invite/<code>.
 *
 * It asks before it acts. The code alone is enough to join, so joining on
 * arrival would mean a scan silently changed which household someone is in —
 * the exact failure this whole body of work started from.
 */
export default function InviteScreen() {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  const { data: preview, isLoading, isError } = useInvitePreview(code);
  const { mutate: redeem, isPending: isJoining } = useRedeemInvite();

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (isLoading) {
    return (
      <ScreenView>
        <ActivityIndicator style={styles.loading} />
      </ScreenView>
    );
  }

  if (isError || !preview) {
    return (
      <ScreenView>
        <ErrorState title="Couldn't check that invite" onRetry={dismiss} />
      </ScreenView>
    );
  }

  const refusal = REFUSALS[preview.status];

  return (
    <ScreenView>
      <View style={styles.content}>
        {refusal ? (
          <>
            <AppText variant="header" size={24}>
              This invite can&apos;t be used
            </AppText>
            <AppText size={16} color="textSecondary">
              {refusal}
            </AppText>
            <MainButton text="Close" variant="secondary" onPress={dismiss} />
          </>
        ) : (
          <>
            <AppText variant="header" size={24}>
              Join {preview.householdName}?
            </AppText>
            <AppText size={16} color="textSecondary">
              You&apos;d join as {preview.role ? roleWithArticle(preview.role) : 'a member'}, and
              you&apos;ll see this household&apos;s pets, feeds and posts.
            </AppText>

            <View style={styles.actions}>
              <MainButton
                text={isJoining ? 'Joining…' : 'Join household'}
                isLoading={isJoining}
                isDisabled={isJoining}
                onPress={() => redeem({ code }, { onSuccess: dismiss })}
              />
              <MainButton
                text="Not now"
                variant="secondary"
                isDisabled={isJoining}
                onPress={dismiss}
              />
            </View>
          </>
        )}
      </View>
    </ScreenView>
  );
}

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    loading: { paddingTop: spacing.five },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.four,
      gap: spacing.three
    },
    actions: { gap: spacing.three, paddingTop: spacing.two }
  });
