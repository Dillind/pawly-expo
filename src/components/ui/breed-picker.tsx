import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { breedsFor, type BreedSpecies } from '@/constants/breeds';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import type { Option } from '@/types/core';
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import MainLegendList from '@/components/core/main-legend-list';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

type Props = {
  species: BreedSpecies;
  value: string | null;
  onChange: (breedId: string) => void;
};

/**
 * Search is what makes the list length free. Lyka curates theirs down to ~510
 * because it is a scroll list with no search; ours is searchable, so the full
 * CC0 set costs the member nothing.
 */
const BreedPicker = ({ species, value, onChange }: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const all = breedsFor(species);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return all;

    // Rank a prefix match above a match in the middle: typing "lab" should
    // reach Labrador before Black Labrador.
    return all
      .map((breed) => ({ breed, at: breed.label.toLowerCase().indexOf(term) }))
      .filter(({ at }) => at >= 0)
      .sort((a, b) => a.at - b.at || a.breed.label.localeCompare(b.breed.label, 'en'))
      .map(({ breed }) => breed);
  }, [all, query]);

  const renderItem = ({ item, index }: LegendListRenderItemProps<Option>) => {
    const isSelected = item.value === value;

    return (
      <>
        {index > 0 && <View style={styles.rule} />}
        <PressableOpacity
          style={[styles.row, isSelected && styles.rowSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={() => onChange(item.value)}>
          <AppText size={16} fontWeight={isSelected ? 'semibold' : 'regular'}>
            {item.label}
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
          value={query}
          onChangeText={setQuery}
          placeholder="Search breeds"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {results.length === 0 ? (
        <AppText size={15} align="center" color="textSecondary" style={styles.noResults}>
          {`No breed matches "${query.trim()}". Pick Unknown and tell us later.`}
        </AppText>
      ) : (
        <MainLegendList<Option>
          data={results}
          keyExtractor={(item) => item.value}
          renderItem={renderItem}
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
    container: { flex: 1, gap: spacing.three },
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
    input: { flex: 1, fontSize: 16, color: colors.text },
    card: {
      flex: 1,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    list: { paddingVertical: spacing.one },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
      paddingHorizontal: spacing.four
    },
    rowSelected: { backgroundColor: colors.primaryMuted },
    rule: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing.four,
      backgroundColor: colors.border
    },
    noResults: { paddingVertical: spacing.six }
  });

export default BreedPicker;
