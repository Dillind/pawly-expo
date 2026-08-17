import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  label: string;
};

const AuthDivider = ({ label }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={styles.rule}>
        <Divider />
      </View>
      <AppText color="textSecondary" size={13} align="center">
        {label}
      </AppText>
      <View style={styles.rule}>
        <Divider />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    rule: {
      flex: 1
    }
  });

export default AuthDivider;
