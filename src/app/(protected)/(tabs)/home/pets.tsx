import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import PetManageRow from '@/components/screens/home/pet-manage-row';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { usePets } from '@/hooks/queries/use-pets';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useStyles } from '@/hooks/use-styles';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const Pets = () => {
  const styles = useStyles(makeStyles);

  const { data: pets = [], isLoading, isError, refetch } = usePets();
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

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

    if (isLoading) return <ActivityIndicator />;

    if (pets.length === 0) {
      return (
        <EmptyState
          icon="pawPrint"
          title="No pets yet"
          description="Add a pet to start tracking feeds."
          action={<MainButton text="Add a pet" href="/home/add-pet" />}
        />
      );
    }

    return (
      <View style={styles.list}>
        {pets.map((pet) => (
          <PetManageRow key={pet.id} pet={pet} />
        ))}
      </View>
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
      paddingTop: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    list: {
      gap: spacing.two
    }
  });

export default Pets;
