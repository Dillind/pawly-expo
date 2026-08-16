import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

// Disabled until the providers exist: CRU-026 (Apple) and CRU-027 (Google).
// They are laid out now because the welcome screen has to be balanced around
// them, and a button that appears later moves everything under it.
//
// Apple takes primary weight once it works. Until then the only live path is
// the loudest one, so a dead button is never the obvious thing to press.
const SocialAuthButtons = () => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <MainButton text="Continue with Apple" variant="secondary" isDisabled onPress={() => {}} />
      <MainButton text="Continue with Google" variant="secondary" isDisabled onPress={() => {}} />
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
