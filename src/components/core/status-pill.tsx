import AppText from '@/components/core/app-text';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  label: string;
  /**
   * `sunk` recesses: a state that expects nothing of the member. `primary` is
   * the gold one, and a screen may hold at most one of those.
   */
  tone?: 'sunk' | 'primary';
};

const StatusPill = ({ label, tone = 'sunk' }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.pill, tone === 'primary' && styles.primary]}>
      <AppText size={12} color={tone === 'primary' ? 'primaryText' : 'textSecondary'}>
        {label}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.two,
      paddingVertical: spacing.half,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    primary: {
      backgroundColor: colors.primaryMuted
    }
  });

export default StatusPill;
