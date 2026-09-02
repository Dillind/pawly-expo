import PetAvatar from '@/components/core/pet-avatar';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';
import { StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 34;
const SHOWN = 3;

type Props = {
  pets: Pet[];
  hasUnseenPosts?: boolean;
};

/**
 * A household's pets as an overlapping stack. Every household defaults to
 * `<Name>'s Household`, so the name alone may not tell two apart -- a member
 * always recognises her own dog.
 */
const HouseholdPets = ({ pets, hasUnseenPosts = false }: Props) => {
  const styles = useStyles(makeStyles);

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

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    stack: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    // Negative margin rather than absolute positioning so the row still
    // measures the stack's real width.
    overlap: {
      marginLeft: -AVATAR_SIZE / 3,
      borderRadius: Radius.full,
      borderWidth: 2,
      borderColor: colors.backgroundSheetRow
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
