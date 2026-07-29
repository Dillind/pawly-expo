import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { usePet } from '@/hooks/use-pet';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import * as Notifications from 'expo-notifications';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  onDismiss?: () => void;
};

/**
 * Asks for notification permission in Crumpet's own words before iOS asks in its.
 * The OS dialog is one-shot -- a denial there is only recoverable through
 * Settings -- so the pitch has to be concrete about what arrives and what does
 * not.
 *
 * allowProvisional was considered and rejected: it sidesteps the one-shot
 * problem, but a provisional alert makes no sound and shows no banner, and
 * "your partner just fed the dog" is worthless if you find it tomorrow.
 */
const NotificationPrimingSheet = ({ sheetRef, onDismiss }: Props) => {
  const styles = useStyles(makeStyles);
  const { data: pet } = usePet();

  const petName = pet?.name ?? 'your pet';

  const requestPermission = async () => {
    // provideAppNotificationSettings is what puts a button inside Crumpet's own
    // page in iOS Settings that deep-links back to Manage Notifications.
    // Without it that route is unreachable from Settings.
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: false,
        provideAppNotificationSettings: true
      }
    });

    void sheetRef.current?.dismiss();
  };

  return (
    <BaseSheet
      sheetRef={sheetRef}
      detents={['auto']}
      title={`Get told when someone feeds ${petName}`}
      onDismiss={onDismiss}>
      <AppText size={14} color="textSecondary">
        So nobody doubles up. We&apos;ll let you know the moment another member logs a feed — and
        nothing else.
      </AppText>

      <View style={styles.actions}>
        <MainButton
          text="Turn on notifications"
          onPress={() => {
            void requestPermission();
          }}
        />
        <MainButton
          text="Not now"
          variant="secondary"
          onPress={() => {
            void sheetRef.current?.dismiss();
          }}
        />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    actions: {
      gap: spacing.two
    }
  });

export default NotificationPrimingSheet;
