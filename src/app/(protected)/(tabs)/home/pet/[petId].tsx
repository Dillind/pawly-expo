import ErrorState from '@/components/core/error-state';
import HeaderIconButton from '@/components/core/header-icon-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import GalleryStrip from '@/components/screens/pet/gallery-strip';
import PetBio from '@/components/screens/pet/pet-bio';
import PetHeader from '@/components/screens/pet/pet-header';
import ScheduleSection from '@/components/screens/pet/schedule-section';
import SectionCard from '@/components/screens/pet/section-card';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { usePetDetail } from '@/hooks/queries/use-pet-detail';
import { useRemovePet } from '@/hooks/queries/use-pet-mutations';
import { useStyles } from '@/hooks/use-styles';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);
  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);
  const { data: household } = useHousehold();
  const { mutate: removePet, isPending: isRemoving } = useRemovePet();
  const router = useRouter();

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

  const confirmRemove = () =>
    Alert.alert(
      `Remove ${pet.name}?`,
      `This deletes every feed logged for ${pet.name}, their Care Card, their photos and their feeding schedule. It cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removePet(pet.id, { onSuccess: () => router.replace('/home') })
        }
      ]
    );

  return (
    <ScreenView edges={[]}>
      <Stack.Screen
        options={{
          headerTitle: pet.name,
          headerRight: household?.isOwner
            ? () => (
                <HeaderIconButton
                  name="trash"
                  accessibilityLabel={`Remove ${pet.name}`}
                  color="error"
                  size={22}
                  strokeWidth={2.3}
                  isLoading={isRemoving}
                  isDisabled={isRemoving}
                  onPress={confirmRemove}
                />
              )
            : undefined
        }}
      />

      <ScreenScrollView contentContainerStyle={styles.content}>
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
