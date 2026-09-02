import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import { Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  title?: string;
  /** Left inset of the divider, so it starts under the row's text rather than its glyph. */
  dividerInset?: number;
  children: ReactNode;
};

const DEFAULT_DIVIDER_INSET = Spacing.three + 18 + Spacing.three;

const SettingsSection = ({ title, dividerInset = DEFAULT_DIVIDER_INSET, children }: Props) => {
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
            {index > 0 && <View style={[styles.divider, { marginLeft: dividerInset }]} />}
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
      backgroundColor: colors.background
    }
  });

export default SettingsSection;
