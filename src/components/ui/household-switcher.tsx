import HouseholdSwitcherSheet from '@/components/bottom-sheets/household-switcher-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * The active household's name, and a chevron that opens the switcher.
 *
 * With one household there is no chevron and no tap target -- a dropdown over a
 * list of one is worse than none. It appears when the second household does.
 */
const HouseholdSwitcher = () => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);

  const { data: household } = useHousehold();
  const { data: households = [] } = useHouseholds();

  if (!household) return null;

  const title = (
    <AppText variant="header" size={20} numberOfLines={1}>
      {household.name}
    </AppText>
  );

  if (households.length < 2) return <View style={styles.row}>{title}</View>;

  return (
    <>
      <PressableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Switch household. Currently ${household.name}`}
        onPress={() => {
          void sheetRef.current?.present();
        }}>
        <View style={styles.row}>
          {title}
          <Icon name="caretDown" size={18} color="textSecondary" />
        </View>
      </PressableOpacity>

      <HouseholdSwitcherSheet sheetRef={sheetRef} activeHouseholdId={household.id} />
    </>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.one }
  });

export default HouseholdSwitcher;
