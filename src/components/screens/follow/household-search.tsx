import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';

import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import SettingsSection from '@/components/core/settings-section';
import ScrollScreen from '@/components/layout/scroll-screen';
import HouseholdSearchRow, {
  SEARCH_ROW_CREST
} from '@/components/screens/follow/household-search-row';
import { Spacing, type AppTheme } from '@/constants/theme';
import { SEARCH_MIN_LENGTH, useHouseholdSearch } from '@/hooks/queries/follow/use-follows';
import { useDebounce } from '@/hooks/use-debounce';
import { useStyles } from '@/hooks/use-styles';

const DEBOUNCE_MS = 250;
const ROW_INSET = Spacing.three + SEARCH_ROW_CREST + Spacing.three;

// Rows reflow on nearly every keystroke, so the move has to be felt rather than
// watched. 150ms is the ceiling for something this frequent.
const ROW_LAYOUT = LinearTransition.duration(150).reduceMotion(ReduceMotion.System);

type Props = {
  term: string;
};

/**
 * Listed Households matched by name or handle. A row opens the follow landing
 * screen; its button sends the request without leaving.
 */
const HouseholdSearch = ({ term }: Props) => {
  const styles = useStyles(makeStyles);

  const [settled] = useDebounce(term.trim(), DEBOUNCE_MS);
  const isSearchable = settled.length >= SEARCH_MIN_LENGTH;

  const { data: results = [], isLoading, isError, refetch } = useHouseholdSearch(settled);

  const renderBody = () => {
    if (!isSearchable) {
      return (
        <EmptyState
          icon="search"
          title="Search for a household"
          description="Find them by name or handle. They will need to accept."
        />
      );
    }

    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError) {
      return <ErrorState title="Couldn't run that search" onRetry={() => void refetch()} />;
    }

    if (results.length === 0) {
      return (
        <EmptyState
          icon="search"
          title={`No households match "${settled}"`}
          description="Only households that chose to be listed can be found. Try their handle."
        />
      );
    }

    return (
      <Animated.View layout={ROW_LAYOUT}>
        <SettingsSection dividerInset={ROW_INSET}>
          {results.map((household) => (
            <HouseholdSearchRow key={household.householdId} household={household} />
          ))}
        </SettingsSection>
      </Animated.View>
    );
  };

  return <ScrollScreen contentContainerStyle={styles.content}>{renderBody()}</ScrollScreen>;
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      marginTop: spacing.five
    },
    content: {
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.four,
      paddingBottom: spacing.six
    }
  });

export default HouseholdSearch;
