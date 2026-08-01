import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import CareCardSection from '@/components/screens/pet/care-card-section';
import GalleryStrip from '@/components/screens/pet/gallery-strip';
import PetBio from '@/components/screens/pet/pet-bio';
import PetHeader from '@/components/screens/pet/pet-header';
import ScheduleSection from '@/components/screens/pet/schedule-section';
import SectionCard from '@/components/screens/pet/section-card';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { usePetDetail } from '@/hooks/use-pet-detail';
import { useStyles } from '@/hooks/use-styles';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);
  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);

  if (!petId || isError) {
    return (
      <ScreenView>
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
      <ScreenView>
        <ActivityIndicator />
      </ScreenView>
    );
  }

  return (
    <ScreenView>
      <Stack.Screen options={{ headerTitle: pet.name }} />

      <ScrollView contentContainerStyle={styles.content}>
        <PetHeader
          petId={pet.id}
          name={pet.name}
          breed={pet.breed}
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

        <SectionCard>
          <CareCardSection petId={pet.id} />
        </SectionCard>
      </ScrollView>
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
