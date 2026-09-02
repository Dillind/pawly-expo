import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** The avatar or the emoji that stands at the head of the pill. */
  leading?: ReactNode;
  /** Absent on an Occasion that carries an emoji and no words. */
  label?: string | null;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * The pill under a Post's caption. One shell, so a pet and an Occasion cannot
 * drift apart -- they answer the same question and sit in the same row.
 */
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
      // The avatar and the emoji fill the same 20pt slot, so both hug the left
      // edge. A pill with neither needs the padding back.
      paddingLeft: spacing.one,
      borderRadius: Radius.full,
      // Not `backgroundElement`: it is #FFFFFF, and so is `postSurface`, so the
      // pill had no edge at all in light mode.
      backgroundColor: colors.backgroundSelected
    },
    chipWithoutLeading: {
      paddingLeft: spacing.two
    }
  });

export default PostChip;
