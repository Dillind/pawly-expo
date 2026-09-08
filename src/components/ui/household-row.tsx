import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import HouseholdPets, { HOUSEHOLD_PETS_WIDTH } from '@/components/ui/household-pets';
import { Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdSummary } from '@/types/core';

/** The divider inset a section needs to clear the pet stack rather than a glyph. */
export const HOUSEHOLD_ROW_DIVIDER_INSET = Spacing.three + HOUSEHOLD_PETS_WIDTH + Spacing.three;

type Props = {
  household: HouseholdSummary;
};

const HouseholdRow = ({ household }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  // The pets identify the household; the name often cannot, because every one
  // of them defaults to `<Name>'s Household`.
  const petNames = household.pets.map((pet) => pet.name);
  const role = household.isOwner ? 'Owner' : 'Contributor';
  // Role first: on a narrower screen three pet names push it past the edge, and
  // the role is the half that decides what the next screen lets you do.
  const subtitle = petNames.length > 0 ? `${role} · ${petNames.join(', ')}` : role;

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${household.name} settings`}
      onPress={() => router.push(`/profile/household/${household.id}`)}>
      <View style={styles.row}>
        <View style={styles.avatars}>
          <HouseholdPets pets={household.pets} ringColor="backgroundElement" />
        </View>

        <View style={styles.text}>
          <AppText size={16} numberOfLines={1}>
            {household.name}
          </AppText>
          <AppText size={13} color="textSecondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>

        <Icon name="caretRight" size={16} color="textSecondary" />
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: 56,
      paddingHorizontal: spacing.three
    },
    avatars: {
      width: HOUSEHOLD_PETS_WIDTH
    },
    text: {
      flex: 1,
      gap: spacing.half
    }
  });

export default HouseholdRow;
