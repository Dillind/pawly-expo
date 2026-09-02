import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { InterFontFamily, Radius, type AppTheme } from '@/constants/theme';
import { useDebounce } from '@/hooks/use-debounce';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';

const HEIGHT = 44;
const DEBOUNCE_MS = 250;

type Props = {
  onSearch: (term: string) => void;
  placeholder?: string;
  /** Milliseconds held before `onSearch` fires. Pass 0 to report every keystroke. */
  debounceMs?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A search field that reports a settled term, not every keystroke. The typed
 * text stays local so the field never lags behind the finger.
 */
const SearchBar = ({
  onSearch,
  placeholder = 'Search',
  debounceMs = DEBOUNCE_MS,
  containerStyle
}: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [term, setTerm] = useState('');
  const [settled] = useDebounce(term, debounceMs);

  useEffect(() => {
    onSearch(settled);
    // `onSearch` is usually an inline arrow, so depending on it would fire on
    // every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  return (
    <View style={[styles.field, containerStyle]}>
      <Icon name="search" size={18} color="textSecondary" />

      <TextInput
        style={styles.input}
        value={term}
        onChangeText={setTerm}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
      />

      {term.length > 0 && (
        <PressableOpacity
          onPress={() => setTerm('')}
          accessibilityRole="button"
          accessibilityLabel="Clear the search">
          <Icon name="close" size={16} color="textSecondary" />
        </PressableOpacity>
      )}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      height: HEIGHT,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSelected
    },
    input: {
      flex: 1,
      height: '100%',
      fontSize: 15,
      fontFamily: InterFontFamily.regular,
      color: colors.text
    }
  });

export default SearchBar;
