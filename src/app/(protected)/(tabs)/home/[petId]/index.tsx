import ErrorState from '@/components/core/error-state';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import GalleryStrip from '@/components/screens/pet/gallery-strip';
import PetBio from '@/components/screens/pet/pet-bio';
import PetHeader from '@/components/screens/pet/pet-header';
import ScheduleSection from '@/components/screens/pet/schedule-section';
import SectionCard from '@/components/screens/pet/section-card';
import { BottomTabInset, HeaderTitleStyle, type AppTheme } from '@/constants/theme';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { useStyles } from '@/hooks/use-styles';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);

  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);

  const content = () => {
    if (!petId || isError) {
      return (
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      );
    }

    if (isLoading || !pet) return <ActivityIndicator />;

    return (
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <PetHeader
          petId={pet.id}
          name={pet.name}
          breed={pet.breed}
          sex={pet.sex}
          birthdate={pet.birthdate}
          birthdateIsApproximate={pet.birthdateIsApproximate}
          photoUrl={pet.photoUrl}
        />

        <GalleryStrip petId={pet.id} />

        <SectionCard>
          <ScheduleSection petId={pet.id} />
        </SectionCard>

        <SectionCard>
          <PetBio petId={pet.id} name={pet.name} bio={pet.bio} />
        </SectionCard>
      </ScreenScrollView>
    );
  };

  return (
    <ScreenView edges={[]}>
      {content()}

      {/* Outside the branches above, not inside them. A title declared behind
          an early return leaves the bar with none, and it falls back to the
          route name -- `[petId]/index` flashes until the pet loads. */}
      <Stack.Title style={HeaderTitleStyle}>{pet?.name ?? ''}</Stack.Title>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingTop: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.three
    }
  });

export default PetDetail;
