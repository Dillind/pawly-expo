import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import AuthFooterLink from '@/components/screens/auth/auth-footer-link';
import AuthLegalFooter from '@/components/screens/auth/auth-legal-footer';
import CrumpetBand from '@/components/screens/auth/crumpet-band';
import SocialAuthButtons from '@/components/screens/auth/social-auth-buttons';
import WelcomeArt from '@/components/screens/auth/welcome-art';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const Welcome = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  return (
    <ScreenView edges={['top', 'bottom']}>
      <ScreenScrollView contentContainerStyle={styles.scrollContent}>
        <WelcomeArt />

        <AppText variant="header" size={34} align="center" fontWeight="bold">
          Every feed, every pet, everyone in the loop.
        </AppText>

        <View style={styles.actions}>
          <CrumpetBand />
          <SocialAuthButtons />
          <MainButton text="Continue with email" onPress={() => router.push('/sign-up')} />
          <AuthFooterLink
            prompt="Already have an account?"
            linkText="Sign in here"
            href="/sign-in"
          />
          <AuthLegalFooter />
        </View>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingVertical: spacing.four,
      gap: spacing.three
    },
    // One block: anchoring the buttons alone pushes the legal line past the fold.
    actions: {
      gap: spacing.two,
      marginTop: 'auto',
      paddingTop: spacing.three
    }
  });

export default Welcome;
