import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import PetAvatar from '@/components/core/pet-avatar';
import { Radius, type AppTheme, type ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';

const AVATAR_SIZE = 34;
const SHOWN = 3;
const OVERLAP = AVATAR_SIZE / 3;

type Props = {
  pets: Pet[];
  hasUnseenPosts?: boolean;
  // The surface behind the stack. The overlap ring has to match it.
  ringColor?: ThemeColor;
};

// Every household defaults to `<Name>'s Household`, so the name alone may not
// tell two apart.
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
    // Negative margin, not absolute, so the row measures the real width.
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
