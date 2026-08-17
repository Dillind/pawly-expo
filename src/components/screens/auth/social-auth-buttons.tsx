import PressableOpacity from '@/components/core/pressable-opacity';
import GoogleMark from '@/components/screens/auth/google-mark';
import type { AppTheme } from '@/constants/theme';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { useStyles } from '@/hooks/use-styles';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SOCIAL_BUTTON = {
  height: 52,
  radius: 26,
  googleFill: '#FFFFFF',
  googleLabel: '#1F1F1F',
  googleBorder: '#747775'
} as const;

const SocialAuthButtons = () => {
  const styles = useStyles(makeStyles);
  const { signInWithApple, signInWithGoogle, isPending } = useSocialAuth();
  const [hasAppleAuth, setHasAppleAuth] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setHasAppleAuth);
  }, []);

  return (
    <View style={styles.container}>
      {hasAppleAuth && (
        <View style={isPending && styles.disabled} pointerEvents={isPending ? 'none' : 'auto'}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={SOCIAL_BUTTON.radius}
            style={styles.appleButton}
            onPress={() => void signInWithApple()}
          />
        </View>
      )}

      <PressableOpacity
        style={[styles.button, styles.google, isPending && styles.disabled]}
        disabled={isPending}
        onPress={() => void signInWithGoogle()}
        accessibilityRole="button">
        <GoogleMark />
        <Text style={[styles.label, styles.googleLabel]}>Continue with Google</Text>
      </PressableOpacity>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.two
    },
    appleButton: {
      height: SOCIAL_BUTTON.height
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two,
      height: SOCIAL_BUTTON.height,
      borderRadius: SOCIAL_BUTTON.radius,
      borderCurve: 'continuous'
    },
    google: {
      backgroundColor: SOCIAL_BUTTON.googleFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: SOCIAL_BUTTON.googleBorder
    },
    disabled: {
      opacity: 0.5
    },
    label: {
      fontSize: 17,
      fontWeight: '600'
    },
    googleLabel: {
      color: SOCIAL_BUTTON.googleLabel
    }
  });

export default SocialAuthButtons;
