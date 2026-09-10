import { StyleSheet } from 'react-native';

import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useSessionEmail } from '@/hooks/queries/account/use-session-email';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useStyles } from '@/hooks/use-styles';
import { fullName } from '@/utils/members';

// TODO: Delete account is an App Store 5.1.1(v) requirement -- see CRU-013.
const AccountSettings = () => {
  const styles = useStyles(makeStyles);

  const { data: profile } = useUserProfile();
  const { data: email } = useSessionEmail();

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <SettingsSection>
          <SettingsRow icon="user" label="Name" value={fullName(profile) || 'Not set'} isSoon />
          <SettingsRow icon="mail" label="Email" value={email} />
          <SettingsRow icon="key" label="Update password" isSoon />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon="trash" label="Delete account" variant="destructive" isSoon />
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
