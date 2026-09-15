import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import HouseholdPets from '@/components/ui/household-pets';
import type { AppTheme } from '@/constants/theme';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import { useUnseenByHousehold } from '@/hooks/queries/posts/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { roleLabel } from '@/utils/members';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  activeHouseholdId: string | undefined;
};

const HouseholdSwitcherSheet = ({ sheetRef, activeHouseholdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { setActiveHousehold } = useActiveHouseholdStore();
  const { data: households = [] } = useHouseholds();
  const { byHousehold } = useUnseenByHousehold(households.map((household) => household.id));

  const switchTo = async (householdId: string) => {
    await setActiveHousehold(householdId);
    void sheetRef.current?.dismiss();
  };

  const openJoin = () => {
    void sheetRef.current?.dismiss();
    router.push('/home/join-household');
  };

  const openNew = () => {
    void sheetRef.current?.dismiss();
    router.push('/home/new-household');
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

      <View style={styles.divider} />

      <View style={styles.doors}>
        <SheetRow icon="plus" label="New household" onPress={openNew} />
        <SheetRow icon="key" label="Join with a code" onPress={openJoin} />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    rows: {
      gap: spacing.two
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: spacing.three,
      backgroundColor: colors.border
    },
    doors: {
      gap: spacing.two
    }
  });

export default HouseholdSwitcherSheet;
