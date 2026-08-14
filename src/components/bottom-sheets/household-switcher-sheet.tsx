import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import HouseholdPets from '@/components/ui/household-pets';
import type { AppTheme } from '@/constants/theme';
import { useHouseholds } from '@/hooks/queries/use-households';
import { useUnseenByHousehold } from '@/hooks/queries/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { roleLabel } from '@/utils/members';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  activeHouseholdId: string | undefined;
};

const HouseholdSwitcherSheet = ({ sheetRef, activeHouseholdId }: Props) => {
  const styles = useStyles(makeStyles);
  const { setActiveHousehold } = useActiveHouseholdStore();
  const { data: households = [] } = useHouseholds();
  const { byHousehold } = useUnseenByHousehold(households.map((household) => household.id));

  const switchTo = async (householdId: string) => {
    await setActiveHousehold(householdId);
    void sheetRef.current?.dismiss();
  };

  return (
    <BaseSheet sheetRef={sheetRef} title="Your households" detents={['auto']}>
      <View style={styles.rows}>
        {households.map((household) => (
          <SheetRow
            key={household.id}
            label={household.name}
            detail={roleLabel(household.role)}
            isSelected={household.id === activeHouseholdId}
            leading={
              <HouseholdPets pets={household.pets} hasUnseenPosts={byHousehold[household.id]} />
            }
            onPress={() => {
              void switchTo(household.id);
            }}
          />
        ))}
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: { gap: spacing.two }
  });

export default HouseholdSwitcherSheet;
