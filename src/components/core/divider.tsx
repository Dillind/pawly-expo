import { useThemedStyles } from '@/hooks/use-themed-styles';
import { View } from 'react-native';

const Divider = () => {
  const styles = useThemedStyles((colors) => ({
    divider: {
      height: 1,
      width: '100%',
      backgroundColor: colors.textSecondary,
      marginVertical: 4
    }
  }));

  return <View style={styles.divider} />;
};

export default Divider;
