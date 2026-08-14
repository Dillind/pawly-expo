import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import type { AppTheme } from '@/constants/theme';
import { useUnreadAlertCount } from '@/hooks/queries/use-alerts';
import { useStyles } from '@/hooks/use-styles';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const MAX_SHOWN = 99;

type Props = {
  householdId: string | undefined;
};

const NotificationBell = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: unread = 0 } = useUnreadAlertCount(householdId);

  return (
    <View>
      <IconButton
        name="bell"
        accessibilityLabel={
          unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
        }
        variant="ghost"
        size={22}
        onPress={() => router.push('/home/notifications')}
      />

      {unread > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <AppText size={11} color="onPrimary" fontWeight="bold">
            {unread > MAX_SHOWN ? `${MAX_SHOWN}+` : unread}
          </AppText>
        </View>
      )}
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error,
      borderWidth: 2,
      borderColor: colors.background
    }
  });

export default NotificationBell;
