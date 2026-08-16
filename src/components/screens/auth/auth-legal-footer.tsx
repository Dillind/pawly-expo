import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { openExternalUrl } from '@/utils/external-link';
import { StyleSheet, View } from 'react-native';

// TODO(CRU-023): placeholder destinations. A privacy policy link is required
// for App Store review, so these have to resolve before submission.
const TERMS_URL = 'https://crumpet.com.au/terms';
const PRIVACY_URL = 'https://crumpet.com.au/privacy';

const AuthLegalFooter = () => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <AppText color="textSecondary" size={12} align="center">
        By using Crumpet, you agree to our{' '}
        <AppText
          color="textSecondary"
          size={12}
          fontWeight="bold"
          onPress={() => void openExternalUrl(TERMS_URL)}>
          Terms of Use
        </AppText>{' '}
        and{' '}
        <AppText
          color="textSecondary"
          size={12}
          fontWeight="bold"
          onPress={() => void openExternalUrl(PRIVACY_URL)}>
          Privacy Policy
        </AppText>
        .
      </AppText>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.four
    }
  });

export default AuthLegalFooter;
