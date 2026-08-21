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
    <AppText variant="header" size={22} fontWeight="bold" numberOfLines={1}>
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
          <View style={styles.chevron}>
            <Icon name="caretDown" size={15} color="text" strokeWidth={2.5} />
          </View>
        </View>
      </PressableOpacity>

      <HouseholdSwitcherSheet sheetRef={sheetRef} activeHouseholdId={household.id} />
    </>
  );
};

const CHEVRON_SIZE = 26;

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.two },
    chevron: {
      width: CHEVRON_SIZE,
      height: CHEVRON_SIZE,
      borderRadius: CHEVRON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    }
  });

export default HouseholdSwitcher;
