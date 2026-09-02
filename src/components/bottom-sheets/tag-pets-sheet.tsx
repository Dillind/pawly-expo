import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import PetAvatar from '@/components/core/pet-avatar';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  pets: Pet[];
  selectedPetIds: string[];
  onToggle: (petId: string) => void;
  onDone: () => void;
};

const AVATAR = 28;

/**
 * Multi-select, and nothing is ever pre-selected -- not even in a single-pet
 * household. A tag is a claim about what is in the photo, so an untagged Post
 * has to be able to mean "no pet in particular" (the empty bowl, a note about
 * the vet). Ticking the only pet by default would make every Post claim a
 * subject its author never chose.
 */
const TagPetsSheet = ({ sheetRef, pets, selectedPetIds, onToggle, onDone }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet sheetRef={sheetRef} title="Tag pets" detents={['auto']}>
      <AppText size={14} color="textSecondary">
        Optional. Say which of your pets are in the photo.
      </AppText>

      <View style={styles.rows}>
        {pets.map((pet) => (
          <SheetRow
            key={pet.id}
            label={pet.name}
            leading={<PetAvatar photoUrl={pet.photoUrl} size={AVATAR} />}
            isSelected={selectedPetIds.includes(pet.id)}
            isCheckbox
            onPress={() => onToggle(pet.id)}
          />
        ))}
      </View>

      <MainButton text="Done" onPress={onDone} />
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: {
      gap: spacing.two
    }
  });

export default TagPetsSheet;
