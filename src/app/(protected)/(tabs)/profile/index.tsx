import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import SegmentedControl from '@/components/core/segmented-control';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import type { AppTheme } from '@/constants/theme';
import { useLogout } from '@/hooks/use-logout';
import { useStyles } from '@/hooks/use-styles';
import { useThemeStore } from '@/stores/theme-store';
import type { Option, ThemePreference } from '@/types/core';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const APPEARANCE_OPTIONS: Option<ThemePreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

const Profile = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { logout, isLoading } = useLogout();
  const { preference, setPreference } = useThemeStore();

  return (
    <ScreenView>
      <ScreenScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="always">
        <AppText variant="header" size={32}>
          Profile
        </AppText>

        <PressableOpacity style={styles.row} onPress={() => router.push('/profile/notifications')}>
          <Icon name="bell" size={18} color="textSecondary" />
          <AppText size={16} style={styles.rowLabel}>
            Notifications
          </AppText>
          <Icon name="caretRight" size={18} color="textSecondary" />
        </PressableOpacity>

        <SegmentedControl
          label="Appearance"
          options={APPEARANCE_OPTIONS}
          value={preference}
          onChange={(next) => void setPreference(next)}
        />

        <View>
          <MainButton
            text="Sign out"
            variant="destructive"
            isLoading={isLoading}
            isDisabled={isLoading}
            onPress={() => void logout()}
          />
        </View>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
      gap: spacing.three
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    rowLabel: {
      flex: 1
    }
  });

export default Profile;
