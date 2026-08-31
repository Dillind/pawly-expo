import Divider from '@/components/core/divider';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import ListCard from '@/components/core/list-card';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import PetManageRow from '@/components/screens/home/pet-manage-row';
import PetsSkeleton from '@/components/screens/home/pets-skeleton';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { usePets } from '@/hooks/queries/pet/use-pets';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useStyles } from '@/hooks/use-styles';
import { todayInTimezone } from '@/lib/dates';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

// The rule starts under the name rather than under the avatar: a rule that
// crosses the avatar column reads as a table, not as a list of pets.
const DIVIDER_INSET = 78;

const Pets = () => {
  const styles = useStyles(makeStyles);

  const { data: pets = [], isLoading, isError, refetch } = usePets();
  const { data: household } = useHousehold();
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const isOwner = household?.isOwner ?? false;
  const today = household?.timezone ? todayInTimezone(household.timezone) : undefined;

  const renderBody = () => {
    if (isError) {
      return (
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      );
    }

    if (isLoading) return <PetsSkeleton />;

    // Nothing to add to, so one action rather than a ghost row beneath a list
    // that is not there.
    if (pets.length === 0) {
      return (
        <View style={styles.empty}>
          <EmptyState
            icon="pawPrint"
            title="No pets yet"
            description="Add a pet and your household can start logging feeds."
          />
          {isOwner && <MainButton text="Add a pet" variant="secondary" href="/home/add-pet" />}
        </View>
      );
    }

    return (
      <>
        <ListCard>
          {pets.map((pet, index) => (
            <Fragment key={pet.id}>
              {index > 0 && <Divider inset={DIVIDER_INSET} />}
              <PetManageRow pet={pet} today={today} />
            </Fragment>
          ))}
        </ListCard>
      </>
    );
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}>
        {renderBody()}
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingTop: spacing.two,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.three
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.two
    }
  });

export default Pets;
