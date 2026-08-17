import AppText from '@/components/core/app-text';
import { PasswordRules } from '@/constants/enums';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const PasswordGuidelines = () => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <AppText size={14} fontWeight="bold">
        Password guidelines
      </AppText>
      <AppText size={12} color="textSecondary">
        {PasswordRules}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.one,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.primaryMuted
    }
  });

export default PasswordGuidelines;
