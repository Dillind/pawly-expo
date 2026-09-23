import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';

import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import SettingsSection from '@/components/core/settings-section';
import ScrollScreen from '@/components/layout/scroll-screen';
import AskingAsSheet from '@/components/screens/follow/asking-as-sheet';
import HouseholdSearchRow, {
  SEARCH_ROW_CREST
} from '@/components/screens/follow/household-search-row';
import { BottomTabInset, Spacing, type AppTheme } from '@/constants/theme';
import { SEARCH_MIN_LENGTH, useHouseholdSearch } from '@/hooks/queries/follow/use-follows';
import { useDebounce } from '@/hooks/use-debounce';
import { useSendFollowRequest } from '@/hooks/use-send-follow-request';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdSearchResult } from '@/services/follow.service';

const DEBOUNCE_MS = 250;
const ROW_INSET = Spacing.three + SEARCH_ROW_CREST + Spacing.three;

// Rows reflow on nearly every keystroke, so 150ms is the ceiling.
const ROW_LAYOUT = LinearTransition.duration(150).reduceMotion(ReduceMotion.System);

type Props = {
  term: string;
};

const HouseholdSearch = ({ term }: Props) => {
  const styles = useStyles(makeStyles);

  const [settled] = useDebounce(term.trim(), DEBOUNCE_MS);
  const isSearchable = settled.length >= SEARCH_MIN_LENGTH;

  const {
    data: results = [],
    isLoading,
    isError,
    isPlaceholderData,
    refetch
  } = useHouseholdSearch(settled);

  // Stale rows stay visible but must not stay pressable. `isPlaceholderData`
  // alone is not enough: through the debounce the key has not changed, so the
  // data is current for a term already typed past.
  const isStale = term.trim() !== settled || isPlaceholderData;

  const { askingAs, send, sendingHouseholdId } = useSendFollowRequest();
  const askingAsRef = useRef<TrueSheet | null>(null);
  const [choosingFor, setChoosingFor] = useState<HouseholdSearchResult | null>(null);

  // No room on a row for "Asking as", so the default is sent and the toast names it.
  const follow = (household: HouseholdSearchResult) => {
    if (!askingAs.isReady) return;
    if (!askingAs.needsChoice) return send(household.householdId);

    setChoosingFor(household);
    void askingAsRef.current?.present();
  };

  const renderBody = () => {
    if (askingAs.isReady && !askingAs.canFollow) {
      return (
        <EmptyState
          icon="search"
          title="Only Owners can follow"
          description="Following is done as a household you own. Ask your household's Owner."
        />
      );
    }

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
      <Animated.View layout={ROW_LAYOUT} style={isStale && styles.stale}>
        <SettingsSection dividerInset={ROW_INSET}>
          {results.map((household) => (
            <HouseholdSearchRow
              key={household.householdId}
              household={household}
              isStale={isStale}
              isSending={sendingHouseholdId === household.householdId || !askingAs.isReady}
              onFollow={() => follow(household)}
            />
          ))}
        </SettingsSection>
      </Animated.View>
    );
  };

  return (
    <>
      <ScrollScreen contentContainerStyle={styles.content}>{renderBody()}</ScrollScreen>
      <AskingAsSheet
        sheetRef={askingAsRef}
        askingAs={askingAs}
        targetName={choosingFor?.name ?? 'The household'}
        confirmText="Follow"
        onConfirm={(ids) => {
          askingAs.choose(ids);
          if (choosingFor) send(choosingFor.householdId, ids);
        }}
      />
    </>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      marginTop: spacing.five
    },
    stale: {
      opacity: 0.5
    },
    content: {
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four
    }
  });

export default HouseholdSearch;
