import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useSessionEmail } from '@/hooks/queries/use-session-email';
import { useUserProfile } from '@/hooks/queries/use-user-profile';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet } from 'react-native';

// TODO: Delete account is required by App Store guideline 5.1.1(v) before
// submission. Open question: what happens to a household when its last Owner
// deletes. Agreed direction is to block until another Owner exists.
const AccountSettings = () => {
  const styles = useStyles(makeStyles);

  const { data: profile } = useUserProfile();
  const { data: email } = useSessionEmail();

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <SettingsSection>
          <SettingsRow icon="user" label="Name" value={fullName || undefined} isSoon />
          <SettingsRow icon="mail" label="Email" value={email} />
          <SettingsRow icon="key" label="Update password" isSoon />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon="trash" label="Delete account" isSoon isDestructive />
        </SettingsSection>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    }
  });

export default AccountSettings;
