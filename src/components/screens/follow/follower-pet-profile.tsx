import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import ListCard from '@/components/core/list-card';
import PetAvatar from '@/components/core/pet-avatar';
import SectionLabel from '@/components/core/section-label';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { petBreedLabel } from '@/constants/breeds';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { usePetPhotos } from '@/hooks/queries/pet/use-pet-photos';
import { useStyles } from '@/hooks/use-styles';
import { formatAge } from '@/lib/dates';

const AVATAR = 72;
const TILE_GAP = 8;

type Props = {
  petId: string;
};

/**
 * A Pet as a Follower sees it: identity, gallery, bio. Nothing else.
 *
 * A separate route from `home/[petId]`, on purpose -- that screen is built on
 * the ACTIVE household, whose timezone never resolves for a household the
 * viewer is not in, and it carries feeds, reminders and the Owner controls.
 * This one asks two queries and cannot leak what it never requests. ADR 0036.
 *
 * It carries no note about what it does not show. A Follower never expected
 * feeds, so naming their absence draws a line they could not otherwise see.
 */
const FollowerPetProfile = ({ petId }: Props) => {
  const styles = useStyles(makeStyles);

  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);
  const { data: photos = [] } = usePetPhotos(petId);

  // Every state renders inside the same scroll view. A bare ScreenView under a
  // transparent header draws its content beneath the navigation bar.
  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError || !pet) {
      return <ErrorState title="Couldn't load this pet" onRetry={() => void refetch()} />;
    }

    const breed = petBreedLabel(pet);
    const age = formatAge(pet.birthdate, pet.birthdateIsApproximate);

    return (
      <>
        <ListCard style={styles.identity}>
          <PetAvatar photoUrl={pet.photoUrl} size={AVATAR} />
          <View style={styles.identityText}>
            <AppText variant="header" size={22} fontWeight="bold" numberOfLines={1}>
              {pet.name}
            </AppText>
            {breed && (
              <AppText size={14} color="textSecondary">
                {breed}
              </AppText>
            )}
            {age && (
              <AppText size={14} color="textSecondary">
                {age}
              </AppText>
            )}
          </View>
        </ListCard>

        {photos.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Gallery</SectionLabel>
            <View style={styles.grid}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.tileWrap}>
                  <Image
                    source={photo.url}
                    style={styles.tile}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {pet.bio && (
          <View style={styles.section}>
            <SectionLabel>About</SectionLabel>
            <ListCard style={styles.bio}>
              <AppText size={15}>{pet.bio}</AppText>
            </ListCard>
          </View>
        )}
      </>
    );
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {renderBody()}
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      marginTop: spacing.five
    },
    content: {
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.two,
      paddingBottom: spacing.six,
      gap: spacing.four
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.four
    },
    identityText: {
      flex: 1,
      gap: spacing.half
    },
    section: {
      gap: spacing.two
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: TILE_GAP
    },
    tileWrap: {
      width: `${(100 - 6) / 3}%`,
      aspectRatio: 1,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    tile: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.backgroundSelected
    },
    bio: {
      padding: spacing.four
    }
  });

export default FollowerPetProfile;
