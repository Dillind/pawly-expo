import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import ScreenView from '@/components/layout/screen-view';
import type { AppTheme } from '@/constants/theme';
import { useLogout } from '@/hooks/use-logout';
import { useStyles } from '@/hooks/use-styles';
import { ScrollView, StyleSheet, View } from 'react-native';

const Profile = () => {
  const styles = useStyles(makeStyles);
  const { logout, isLoading } = useLogout();

  return (
    <ScreenView>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="always">
        <AppText variant="header" size={32}>
          Profile
        </AppText>

        <View>
          <MainButton
            text="Sign out"
            variant="secondary"
            isLoading={isLoading}
            isDisabled={isLoading}
            onPress={() => void logout()}
          />
        </View>
      </ScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
      gap: spacing.three
    }
  });

export default Profile;
