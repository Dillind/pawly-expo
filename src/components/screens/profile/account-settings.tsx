import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { StyleSheet } from 'react-native';

import DeleteAccountSheet from '@/components/bottom-sheets/delete-account-sheet';
import EditNameSheet from '@/components/bottom-sheets/edit-name-sheet';
import UpdatePasswordSheet from '@/components/bottom-sheets/update-password-sheet';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { usePrefetchAccountDeletionPlan } from '@/hooks/queries/account/use-account-deletion-plan';
import { useSessionEmail } from '@/hooks/queries/account/use-session-email';
import { useSignInMethod } from '@/hooks/queries/account/use-sign-in-method';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useStyles } from '@/hooks/use-styles';
import { fullName } from '@/utils/members';

const APPLE_RELAY_DOMAIN = '@privaterelay.appleid.com';
const PROVIDER_LABEL = { apple: 'Apple', google: 'Google' } as const;

const AccountSettings = () => {
  const styles = useStyles(makeStyles);

  const nameSheetRef = useRef<TrueSheet | null>(null);
  const passwordSheetRef = useRef<TrueSheet | null>(null);
  const deleteSheetRef = useRef<TrueSheet | null>(null);

  const { data: profile } = useUserProfile();
  const { data: email } = useSessionEmail();
  const { data: method } = useSignInMethod();
  const prefetchDeletionPlan = usePrefetchAccountDeletionPlan();

  const shownEmail = email?.endsWith(APPLE_RELAY_DOMAIN) ? 'Hidden by Apple' : email;

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <SettingsSection>
          <SettingsRow
            icon="user"
            label="Name"
            value={fullName(profile) || 'Not set'}
            onPress={() => void nameSheetRef.current?.present()}
          />
          <SettingsRow icon="mail" label="Email" value={shownEmail} />
          {method === 'email' && (
            <SettingsRow
              icon="key"
              label="Update password"
              onPress={() => void passwordSheetRef.current?.present()}
            />
          )}
          {(method === 'apple' || method === 'google') && (
            <SettingsRow icon="shield" label="Sign-in" value={PROVIDER_LABEL[method]} />
          )}
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            icon="trash"
            label="Delete account"
            variant="destructive"
            onPress={() => {
              void prefetchDeletionPlan();
              void deleteSheetRef.current?.present();
            }}
          />
        </SettingsSection>
      </ScreenScrollView>

      <EditNameSheet
        sheetRef={nameSheetRef}
        firstName={profile?.firstName ?? ''}
        lastName={profile?.lastName ?? ''}
      />
      <UpdatePasswordSheet sheetRef={passwordSheetRef} />
      <DeleteAccountSheet sheetRef={deleteSheetRef} />
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
