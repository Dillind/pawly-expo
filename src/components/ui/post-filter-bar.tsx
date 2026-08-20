import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import type { HouseholdSummary } from '@/types/core';
import { ScrollView, StyleSheet } from 'react-native';

export const ALL_HOUSEHOLDS = 'all';

/** Either `ALL_HOUSEHOLDS` or a single household id. */
export type PostScope = string;

type Props = {
  households: HouseholdSummary[];
  scope: PostScope;
  onChange: (scope: PostScope) => void;
};

/**
 * Scrolls rather than dividing a fixed track into equal segments: household
 * names are user-written, and SegmentedControl squashes a long one.
 */
const PostFilterBar = ({ households, scope, onChange }: Props) => {
  const styles = useStyles(makeStyles);

  const select = (next: PostScope) => {
    if (next === scope) return;

    void hapticLight();
    onChange(next);
  };

  const chip = (value: PostScope, label: string) => {
    const isSelected = value === scope;

    return (
      <PressableOpacity
        key={value}
        style={[styles.chip, isSelected && styles.chipSelected]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected }}
        onPress={() => select(value)}>
        <AppText
          size={14}
          fontWeight={isSelected ? 'bold' : 'regular'}
          color={isSelected ? 'text' : 'textSecondary'}>
          {label}
        </AppText>
      </PressableOpacity>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {chip(ALL_HOUSEHOLDS, 'All households')}
      {households.map((household) => chip(household.id, household.name))}
    </ScrollView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingHorizontal: ScreenGutter
    },
    chip: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: spacing.three,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundElement
    },
    chipSelected: {
      backgroundColor: colors.backgroundSelected
    }
  });

export default PostFilterBar;
