import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import HouseholdCrest from '@/components/core/household-crest';
import Icon from '@/components/core/icon';
import ListCard from '@/components/core/list-card';
import MainButton from '@/components/core/main-button';
import PetAvatar from '@/components/core/pet-avatar';
import PressableOpacity from '@/components/core/pressable-opacity';
import SectionLabel from '@/components/core/section-label';
import ScrollScreen from '@/components/layout/scroll-screen';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import {
  useFollowPreview,
  useRequestFollow,
  useUnfollow
} from '@/hooks/queries/follow/use-follows';
import { usePosts } from '@/hooks/queries/posts/use-posts';
import { useStyles } from '@/hooks/use-styles';
import type { FollowPreviewPet } from '@/services/follow.service';
import { useAuthStore } from '@/stores/auth-store';
import { countText } from '@/utils/counts';

const PET_AVATAR = 36;
const CREST = 80;
const TILE_GAP = 2;

type Props = {
  householdId: string;
};

/**
 * Where a follow link lands, and where a follower comes back to.
 *
 * One route for all three states, because the artboards decided the accepted
 * screen re-uses this one: the button reports the relationship rather than
 * repeating the offer, and the pets become tappable.
 *
 * Before the accept it shows the pets and nothing else -- enough to know it is
 * the right household, not enough to be worth a stranger's request.
 */
const FollowHousehold = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { userId } = useAuthStore();
  const { data: preview, isLoading, isError, refetch } = useFollowPreview(householdId);
  const { mutate: requestFollow, isPending: isRequesting } = useRequestFollow(householdId);
  const { mutate: unfollow, isPending: isUnfollowing } = useUnfollow();

  const isAccepted = preview?.status === 'accepted' || preview?.status === 'member';

  const { data: posts = [] } = usePosts(isAccepted ? [householdId] : [], userId ?? undefined);

  const openPet = (pet: FollowPreviewPet) =>
    router.push({
      pathname: '/follow/[householdId]/pet/[petId]',
      params: { householdId, petId: pet.id }
    });

  const renderPet = (pet: FollowPreviewPet) => {
    const row = (
      <View style={styles.petRow}>
        <PetAvatar photoUrl={pet.photoUrl} size={PET_AVATAR} />
        <View style={styles.petText}>
          <AppText size={16} numberOfLines={1}>
            {pet.name}
          </AppText>
          {pet.breed && (
            <AppText size={13} color="textSecondary" numberOfLines={1}>
              {pet.breed}
            </AppText>
          )}
        </View>
        {isAccepted && <Icon name="caretRight" size={16} color="textSecondary" />}
      </View>
    );

    if (!isAccepted) return <View key={pet.id}>{row}</View>;

    return (
      <PressableOpacity
        key={pet.id}
        accessibilityRole="button"
        accessibilityLabel={`Open ${pet.name}`}
        onPress={() => openPet(pet)}>
        {row}
      </PressableOpacity>
    );
  };

  const photos = posts.flatMap((post) => post.photos).slice(0, 6);

  const renderAction = () => {
    if (!preview) return null;

    if (preview.status === 'member') {
      return (
        <AppText size={13} color="textSecondary" align="center">
          You are already in this household.
        </AppText>
      );
    }

    if (preview.status === 'accepted') {
      return (
        <>
          <MainButton
            text="Following"
            variant="secondary"
            isDisabled={isUnfollowing}
            leftIcon={<Icon name="check" size={19} color="text" />}
            onPress={() => unfollow(householdId)}
          />
          <AppText size={13} color="textSecondary" align="center" style={styles.caption}>
            Their posts are on your Posts tab. Tap to unfollow.
          </AppText>
        </>
      );
    }

    if (preview.status === 'pending') {
      return (
        <>
          <MainButton
            text="Requested"
            variant="secondary"
            isDisabled={isUnfollowing}
            onPress={() => unfollow(householdId)}
          />
          <AppText size={13} color="textSecondary" align="center" style={styles.caption}>
            Waiting on an Owner to accept. Tap to withdraw.
          </AppText>
        </>
      );
    }

    return (
      <>
        <MainButton
          text="Follow"
          isLoading={isRequesting}
          isDisabled={isRequesting}
          leftIcon={<Icon name="userPlus" size={19} color="onPrimary" />}
          onPress={() => requestFollow()}
        />
        <AppText size={13} color="textSecondary" align="center" style={styles.caption}>
          An Owner has to accept your request before you see anything.
        </AppText>
      </>
    );
  };

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError || !preview) {
      return (
        <ErrorState
          title="Couldn't find that household"
          description="The link may be wrong, or the household may have gone."
          onRetry={() => void refetch()}
        />
      );
    }

    return (
      <>
        <View style={styles.crest}>
          <HouseholdCrest size={CREST} iconSize={36} />
          <AppText variant="header" size={24} fontWeight="bold" align="center">
            {preview.name}
          </AppText>
          <AppText size={15} color="textSecondary">
            {countText(preview.pets.length, 'pet')}
          </AppText>
        </View>

        <View style={styles.action}>{renderAction()}</View>

        {preview.pets.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Pets</SectionLabel>
            <ListCard>{preview.pets.map(renderPet)}</ListCard>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>Posts</SectionLabel>
          {isAccepted ? (
            photos.length > 0 ? (
              <View style={styles.grid}>
                {photos.map((photo) => (
                  // The percentage width belongs on a plain View. Given it
                  // directly, expo-image resolves no box and the grid collapses
                  // to nothing -- the section renders its label and no tiles.
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
            ) : (
              <View style={styles.locked}>
                <AppText size={16} fontWeight="bold" align="center">
                  Nothing posted yet
                </AppText>
                <AppText size={14} color="textSecondary" align="center" style={styles.lockedBody}>
                  When this household shares a photo it appears here and on your Posts tab.
                </AppText>
              </View>
            )
          ) : (
            <View style={styles.locked}>
              <View style={styles.lockCircle}>
                <Icon name="lock" size={20} color="textSecondary" />
              </View>
              <AppText size={16} fontWeight="bold" align="center">
                This household is private
              </AppText>
              <AppText size={14} color="textSecondary" align="center" style={styles.lockedBody}>
                Once your request is accepted, their posts and pet profiles appear here and on your
                Posts tab.
              </AppText>
            </View>
          )}
        </View>
      </>
    );
  };

  return <ScrollScreen contentContainerStyle={styles.content}>{renderBody()}</ScrollScreen>;
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
    crest: {
      alignItems: 'center',
      gap: spacing.two
    },
    action: {
      gap: spacing.two
    },
    caption: {
      paddingHorizontal: spacing.two
    },
    section: {
      gap: spacing.two
    },
    petRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: 56,
      paddingHorizontal: spacing.three
    },
    petText: {
      flex: 1,
      gap: spacing.half
    },
    locked: {
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.five,
      paddingHorizontal: spacing.four,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    lockCircle: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    },
    lockedBody: {
      maxWidth: 250
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: TILE_GAP,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    tileWrap: {
      width: `${(100 - 1) / 3}%`,
      aspectRatio: 1
    },
    tile: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.backgroundSelected
    }
  });

export default FollowHousehold;
