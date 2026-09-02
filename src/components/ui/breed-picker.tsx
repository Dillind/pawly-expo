import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainLegendList from '@/components/core/main-legend-list';
import PressableOpacity from '@/components/core/pressable-opacity';
import { breedsFor, type BreedSpecies } from '@/constants/breeds';
import { Radius, type AppTheme } from '@/constants/theme';
import { useDebounce } from '@/hooks/use-debounce';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import type { Option } from '@/types/core';
import { searchBreeds } from '@/utils/breed-search';

type Props = {
  species: BreedSpecies;
  value: string | null;
  onChange: (breedId: string) => void;
};

// Search is what makes the list length free, so this carries the full set
// rather than a curated subset.
const BreedPicker = ({ species, value, onChange }: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Fuzzy matching walks 900 names, so it runs on the settled term rather than
  // on every keystroke. 180ms is under the ~200ms a keystroke feels instant.
  const [settledQuery] = useDebounce(searchQuery, 180);

  const speciesBreeds = breedsFor(species);

  const visibleBreeds = useMemo(
    () => searchBreeds(speciesBreeds, settledQuery),
    [speciesBreeds, settledQuery]
  );

  const renderBreedRow = ({ item: breed, index }: LegendListRenderItemProps<Option>) => {
    const isSelected = breed.value === value;

    return (
      <>
        {index > 0 && <View style={styles.rule} />}
        <PressableOpacity
          style={[styles.row, isSelected && styles.rowSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={() => onChange(breed.value)}>
          <AppText size={16} fontWeight={isSelected ? 'semibold' : 'regular'}>
            {breed.label}
          </AppText>
          {isSelected && <Icon name="check" size={19} color="primaryText" strokeWidth={2.6} />}
        </PressableOpacity>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <Icon name="search" size={17} color="textSecondary" strokeWidth={2.2} />
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search breeds"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {visibleBreeds.length === 0 ? (
        <AppText size={15} align="center" color="textSecondary" style={styles.noResults}>
          {`No breed matches "${settledQuery.trim()}". Pick Unknown and tell us later.`}
        </AppText>
      ) : (
        <MainLegendList<Option>
          data={visibleBreeds}
          keyExtractor={(breed) => breed.value}
          renderItem={renderBreedRow}
          estimatedItemSize={53}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          style={styles.card}
        />
      )}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: spacing.three
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      height: 46,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSelected
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text
    },
    card: {
      flex: 1,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    list: {
      paddingVertical: spacing.one
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
      paddingHorizontal: spacing.four
    },
    rowSelected: {
      backgroundColor: colors.primaryMuted
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing.four,
      backgroundColor: colors.border
    },
    noResults: {
      paddingVertical: spacing.six
    }
  });

export default BreedPicker;
