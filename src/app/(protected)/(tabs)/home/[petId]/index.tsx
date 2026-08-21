import ErrorState from '@/components/core/error-state';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import GalleryStrip from '@/components/screens/pet/gallery-strip';
import PetBio from '@/components/screens/pet/pet-bio';
import PetHeader from '@/components/screens/pet/pet-header';
import ScheduleSection from '@/components/screens/pet/schedule-section';
import SectionCard from '@/components/screens/pet/section-card';
import { BottomTabInset, HeaderTitleStyle, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { useRemovePet } from '@/hooks/queries/pet/use-pet-mutations';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { colors } = useTheme();

  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);
  const { data: household } = useHousehold();
  const { mutate: removePet, isPending: isRemoving } = useRemovePet();

  const confirmRemove = () => {
    if (!pet) return;

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
  };

  const body = () => {
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

  // The header sits outside every early return. Behind one, the bar has no
  // title and falls back to the route name -- `[petId]/index` flashes before
  // the pet loads.
  return (
    <ScreenView edges={[]}>
      {body()}

      <Stack.Title style={HeaderTitleStyle}>{pet?.name ?? ''}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="trash"
          accessibilityLabel={pet ? `Remove ${pet.name}` : 'Remove this pet'}
          tintColor={colors.error}
          hidden={!pet || !household?.isOwner}
          disabled={isRemoving}
          onPress={confirmRemove}
        />
      </Stack.Toolbar>
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
