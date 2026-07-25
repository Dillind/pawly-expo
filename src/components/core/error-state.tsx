import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  title?: string;
  description?: string;
  onRetry: () => void;
};

/**
 * Never let a failed query render as an empty list: an empty Activity and a
 * broken Activity must not look identical.
 */
const ErrorState = ({
  title = "Couldn't load this",
  description = 'Check your connection and try again.',
  onRetry
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Icon name="circleAlert" size={28} color="error" />
      <AppText size={18} fontWeight="bold" align="center">
        {title}
      </AppText>
      <AppText size={14} color="textSecondary" align="center">
        {description}
      </AppText>
      <View style={styles.action}>
        <MainButton text="Retry" variant="text" onPress={onRetry} />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two,
      paddingVertical: spacing.five,
      paddingHorizontal: spacing.four
    },
    action: {
      alignSelf: 'stretch',
      marginTop: spacing.two
    }
  });

export default ErrorState;
