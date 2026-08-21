import ErrorState from '@/components/core/error-state';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import GalleryStrip from '@/components/screens/pet/gallery-strip';
import PetBio from '@/components/screens/pet/pet-bio';
import PetHeader from '@/components/screens/pet/pet-header';
import ScheduleSection from '@/components/screens/pet/schedule-section';
import SectionCard from '@/components/screens/pet/section-card';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { useStyles } from '@/hooks/use-styles';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);

  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);

  if (!petId || isError) {
    return (
      <ScreenView edges={[]}>
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      </ScreenView>
    );
  }

  if (isLoading || !pet) {
    return (
      <ScreenView edges={[]}>
        <ActivityIndicator />
      </ScreenView>
    );
  }

  return (
    <ScreenView edges={[]}>
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
