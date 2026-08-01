import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import PetHeader from '@/components/screens/pet/pet-header';
import ScheduleSection from '@/components/screens/pet/schedule-section';
import type { AppTheme } from '@/constants/theme';
import { usePetDetail } from '@/hooks/use-pet-detail';
import { useStyles } from '@/hooks/use-styles';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);
  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);

  if (isError) {
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
      <ScrollView contentContainerStyle={styles.content}>
        <PetHeader
          name={pet.name}
          breed={pet.breed}
          birthdate={pet.birthdate}
          birthdateIsApproximate={pet.birthdateIsApproximate}
          photoUrl={pet.photoUrl}
        />

        <ScheduleSection petId={pet.id} />
      </ScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: { flexGrow: 1, paddingVertical: spacing.four, gap: spacing.four }
  });

export default PetDetail;
