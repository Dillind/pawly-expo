import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** CRU-026. Omitted until Apple sign-in exists, which disables the button. */
  onApplePress?: () => void;
  /** CRU-027. Omitted until Google sign-in exists, which disables the button. */
  onGooglePress?: () => void;
};

const SocialAuthButtons = ({ onApplePress, onGooglePress }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <MainButton
        text="Continue with Apple"
        variant="secondary"
        isDisabled={!onApplePress}
        onPress={onApplePress ?? (() => {})}
      />
      <MainButton
        text="Continue with Google"
        variant="secondary"
        isDisabled={!onGooglePress}
        onPress={onGooglePress ?? (() => {})}
      />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.two
    }
  });

export default SocialAuthButtons;
