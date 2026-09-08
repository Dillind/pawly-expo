import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import PetAvatar from '@/components/core/pet-avatar';
import { Radius, type AppTheme, type ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';

const AVATAR_SIZE = 34;
const SHOWN = 3;
const OVERLAP = AVATAR_SIZE / 3;

/**
 * The width of the widest stack. A list of households shows one to three pets
 * per row, so the leading column is fixed to this and every row's text starts
 * on the same line.
 */
export const HOUSEHOLD_PETS_WIDTH = AVATAR_SIZE + (SHOWN - 1) * (AVATAR_SIZE - OVERLAP);

type Props = {
  pets: Pet[];
  hasUnseenPosts?: boolean;
  /** The surface behind the stack. The overlap ring has to match it. */
  ringColor?: ThemeColor;
};

/**
 * A household's pets as an overlapping stack. Every household defaults to
 * `<Name>'s Household`, so the name alone may not tell two apart -- a member
 * always recognises her own dog.
 */
const HouseholdPets = ({
  pets,
  hasUnseenPosts = false,
  ringColor = 'backgroundSheetRow'
}: Props) => {
  const styles = useStyles(
    useCallback((theme: AppTheme) => makeStyles(theme, ringColor), [ringColor])
  );

  return (
    <View style={styles.stack}>
      {pets.slice(0, SHOWN).map((pet, index) => (
        <View key={pet.id} style={index > 0 && styles.overlap}>
          <PetAvatar photoUrl={pet.photoUrl} size={AVATAR_SIZE} />
        </View>
      ))}

      {pets.length === 0 && <PetAvatar size={AVATAR_SIZE} />}

      {hasUnseenPosts && <View style={styles.dot} />}
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme, ringColor: ThemeColor) =>
  StyleSheet.create({
    stack: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    // Negative margin rather than absolute positioning so the row still
    // measures the stack's real width.
    overlap: {
      marginLeft: -OVERLAP,
      borderRadius: Radius.full,
      borderWidth: 2,
      borderColor: colors[ringColor]
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: Radius.full,
      backgroundColor: colors.primary,
      marginLeft: 6
    }
  });

export default HouseholdPets;
