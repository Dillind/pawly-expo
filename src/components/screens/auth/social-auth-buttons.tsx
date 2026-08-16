import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

// A missing handler disables its button. Both are missing until CRU-026 and CRU-027.
type Props = {
  onApplePress?: () => void;
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
