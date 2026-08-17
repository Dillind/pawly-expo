import PressableOpacity from '@/components/core/pressable-opacity';
import GoogleMark from '@/components/screens/auth/google-mark';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// A missing handler disables its button. Both are missing until CRU-026 and CRU-027.
type Props = {
  onApplePress?: () => void;
  onGooglePress?: () => void;
};

// Apple and Google both specify how their buttons may look, so these two are
// the one place in the app that does not draw from the theme. Apple's is their
// own native control; only its type, style and corner radius are ours to set.
const SOCIAL_BUTTON = {
  height: 52,
  radius: 26,
  googleFill: '#FFFFFF',
  googleLabel: '#1F1F1F',
  googleBorder: '#747775'
} as const;

const SocialAuthButtons = ({ onApplePress, onGooglePress }: Props) => {
  const styles = useStyles(makeStyles);
  const [hasAppleAuth, setHasAppleAuth] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setHasAppleAuth);
  }, []);

  return (
    <View style={styles.container}>
      {hasAppleAuth && (
        // The native button has no disabled state, so an inert one is dimmed
        // and stops taking touches from out here.
        <View
          style={!onApplePress && styles.disabled}
          pointerEvents={onApplePress ? 'auto' : 'none'}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={SOCIAL_BUTTON.radius}
            style={styles.appleButton}
            onPress={() => onApplePress?.()}
          />
        </View>
      )}

      <PressableOpacity
        style={[styles.button, styles.google, !onGooglePress && styles.disabled]}
        disabled={!onGooglePress}
        onPress={onGooglePress}
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
