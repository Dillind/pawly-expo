import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import AuthFooterLink from '@/components/screens/auth/auth-footer-link';
import AuthLegalFooter from '@/components/screens/auth/auth-legal-footer';
import SocialAuthButtons from '@/components/screens/auth/social-auth-buttons';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

// Fixed so the illustration can drop in without moving the buttons.
const ART_HEIGHT = 200;

const Welcome = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  return (
    <ScreenView edges={['top', 'bottom']}>
      <ScreenScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.art}>
          {/* TODO(CRU-030): the illustration goes here. Keep it within ART_HEIGHT. */}
          <AppText variant="header" size={44} align="center" fontWeight="bold">
            Crumpet
          </AppText>
          <AppText color="textSecondary" size={17} align="center">
            Every feed, every pet, everyone in the loop.
          </AppText>
        </View>

        <View style={styles.actions}>
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
    art: {
      height: ART_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two
    },
    // One block: anchoring the buttons alone pushes the legal line past the fold.
    actions: {
      gap: spacing.two,
      marginTop: 'auto',
      paddingTop: spacing.three
    }
  });

export default Welcome;
