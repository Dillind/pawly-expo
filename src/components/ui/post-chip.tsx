import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  leading?: ReactNode;
  label?: string | null;
  onPress?: () => void;
  accessibilityLabel?: string;
};

// One shell, so a pet and an Occasion cannot drift apart.
const PostChip = ({ leading, label, onPress, accessibilityLabel }: Props) => {
  const styles = useStyles(makeStyles);

  const inner = (
    <>
      {leading}
      {label ? (
        <AppText size={13} color="textSecondary">
          {label}
        </AppText>
      ) : null}
    </>
  );

  const shell = [styles.chip, !leading && styles.chipWithoutLeading];

  if (!onPress) return <View style={shell}>{inner}</View>;

  return (
    <PressableOpacity
      style={shell}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      {inner}
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      paddingVertical: spacing.one,
      paddingRight: spacing.two,
      // Avatar and emoji fill the same 20pt slot, so both hug the left edge.
      paddingLeft: spacing.one,
      borderRadius: Radius.full,
      // Not `backgroundElement`: it matches `postSurface` in light mode and the
      // pill loses its edge.
      backgroundColor: colors.backgroundSelected
    },
    chipWithoutLeading: {
      paddingLeft: spacing.two
    }
  });

export default PostChip;
