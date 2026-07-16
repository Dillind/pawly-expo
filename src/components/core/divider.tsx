import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const Divider = () => {
  const styles = useStyles(makeStyles);

  return <View style={styles.divider} />;
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    divider: {
      height: 1,
      width: '100%',
      backgroundColor: colors.textSecondary,
      marginVertical: 4
    }
  });

export default Divider;
