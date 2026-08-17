import PressableOpacity from '@/components/core/pressable-opacity';
import GoogleMark from '@/components/screens/auth/google-mark';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

// A missing handler disables its button. Both are missing until CRU-026 and CRU-027.
type Props = {
  onApplePress?: () => void;
  onGooglePress?: () => void;
};

// Apple and Google both specify how their buttons may look, so these two are
// the one place in the app that does not draw from the theme.
//
// TODO(CRU-026): Apple's must become expo-apple-authentication's
// AppleAuthenticationButton before release. Apple requires their own control,
// and it needs a native rebuild this visual pass deliberately avoids.
const SOCIAL_BUTTON = {
  height: 52,
  radius: 26,
  appleFill: '#000000',
  appleLabel: '#FFFFFF',
  googleFill: '#FFFFFF',
  googleLabel: '#1F1F1F',
  googleBorder: '#747775'
} as const;

const SocialAuthButtons = ({ onApplePress, onGooglePress }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <PressableOpacity
        style={[styles.button, styles.apple, !onApplePress && styles.disabled]}
        disabled={!onApplePress}
        onPress={onApplePress}
        accessibilityRole="button">
        <Image
          source="sf:apple.logo"
          style={styles.appleMark}
          tintColor={SOCIAL_BUTTON.appleLabel}
        />
        <Text style={[styles.label, styles.appleLabel]}>Continue with Apple</Text>
      </PressableOpacity>

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
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two,
      height: SOCIAL_BUTTON.height,
      borderRadius: SOCIAL_BUTTON.radius,
      borderCurve: 'continuous'
    },
    apple: {
      backgroundColor: SOCIAL_BUTTON.appleFill
    },
    google: {
      backgroundColor: SOCIAL_BUTTON.googleFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: SOCIAL_BUTTON.googleBorder
    },
    disabled: {
      opacity: 0.5
    },
    appleMark: {
      width: 18,
      height: 18
    },
    label: {
      fontSize: 17,
      fontWeight: '600'
    },
    appleLabel: {
      color: SOCIAL_BUTTON.appleLabel
    },
    googleLabel: {
      color: SOCIAL_BUTTON.googleLabel
    }
  });

export default SocialAuthButtons;
