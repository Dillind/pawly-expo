import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PetAvatar from '@/components/core/pet-avatar';
import PressableOpacity from '@/components/core/pressable-opacity';
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

const AVATAR = 36;

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

      <View style={styles.list}>
        {pets.map((pet) => {
          const isSelected = selectedPetIds.includes(pet.id);

          return (
            <PressableOpacity
              key={pet.id}
              style={styles.row}
              onPress={() => onToggle(pet.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={pet.name}>
              <PetAvatar photoUrl={pet.photoUrl} size={AVATAR} />
              <AppText size={16} style={styles.name}>
                {pet.name}
              </AppText>
              {isSelected && <Icon name="check" size={20} color="primary" />}
            </PressableOpacity>
          );
        })}
      </View>

      <MainButton text="Done" onPress={onDone} />
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    list: {
      gap: spacing.one
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.two
    },
    name: {
      flex: 1
    }
  });

export default TagPetsSheet;
