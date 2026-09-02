import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** The avatar or the emoji that stands at the head of the pill. */
  leading: ReactNode;
  label: string;
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
      <AppText size={13} color="textSecondary">
        {label}
      </AppText>
    </>
  );

  if (!onPress) return <View style={styles.chip}>{inner}</View>;

  return (
    <PressableOpacity
      style={styles.chip}
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
      paddingLeft: spacing.one,
      borderRadius: Radius.full,
      // Not `backgroundElement`: it is #FFFFFF, and so is `postSurface`, so the
      // pill had no edge at all in light mode.
      backgroundColor: colors.backgroundSelected
    }
  });

export default PostChip;
