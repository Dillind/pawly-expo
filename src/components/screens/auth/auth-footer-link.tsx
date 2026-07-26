import AppText from '@/components/core/app-text';
import { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const AuthFooterLink = () => {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.container}>
      <AppText color="primary" size={14} fontWeight="regular">
        Forgot Password?
      </AppText>
      <Link href="/forgot-password" asChild>
        <AppText color="textSecondary" size={14} fontWeight="bold">
          Reset Here
        </AppText>
      </Link>
    </View>
  );
};

export default AuthFooterLink;

const makeStyles = ({}: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 4
    }
  });
