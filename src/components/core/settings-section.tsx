import AppText from '@/components/core/app-text';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  title?: string;
  children: ReactNode;
};

const SettingsSection = ({ title, children }: Props) => {
  const styles = useStyles(makeStyles);
  const rows = Children.toArray(children);

  return (
    <View style={styles.section}>
      {title && (
        <AppText size={13} color="textSecondary" style={styles.title}>
          {title}
        </AppText>
      )}

      <View style={styles.card}>
        {rows.map((row, index) => (
          // Index as key: section rows are a fixed literal list, never reordered.
          <View key={index}>
            {index > 0 && <View style={styles.divider} />}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    section: {
      gap: spacing.two
    },
    title: {
      paddingHorizontal: spacing.one
    },
    card: {
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      paddingVertical: spacing.one,
      overflow: 'hidden'
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.background,
      marginLeft: spacing.three + 18 + spacing.three
    }
  });

export default SettingsSection;
