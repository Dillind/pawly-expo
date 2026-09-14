import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import PetAvatar from '@/components/core/pet-avatar';
import OccasionEmoji from '@/components/ui/occasion-emoji';
import PostChip from '@/components/ui/post-chip';
import { type AppTheme } from '@/constants/theme';
import { useFollowedHouseholdIds } from '@/hooks/queries/follow/use-follows';
import { useStyles } from '@/hooks/use-styles';
import type { PostOccasion, PostPetTag } from '@/services/post.service';

type Props = {
  occasion: PostOccasion | null;
  pets: PostPetTag[];
  // Decides which Pet screen a tag opens.
  householdId: string;
};

const AVATAR = 20;

// The Occasion leads because it names the day; the Pets follow.
const PostChips = ({ occasion, pets, householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  // /home/[petId] loads feed times and the Care Card, which a Follower cannot
  // read, so the screen sits on its skeleton for ever rather than failing.
  const isFollowed = useFollowedHouseholdIds().includes(householdId);

  const openPet = (petId: string) =>
    isFollowed
      ? router.push({
          pathname: '/follow/[householdId]/pet/[petId]',
          params: { householdId, petId }
        })
      : router.push(`/home/${petId}`);

  if (!occasion && pets.length === 0) return null;

  return (
    <View style={styles.row}>
      {occasion && (
        <PostChip
          leading={occasion.emoji ? <OccasionEmoji emoji={occasion.emoji} size={AVATAR} /> : null}
          label={occasion.label}
        />
      )}

      {pets.map((pet) => (
        <PostChip
          key={pet.id}
          leading={<PetAvatar photoUrl={pet.photoUrl} size={AVATAR} />}
          label={pet.name}
          accessibilityLabel={`View ${pet.name}`}
          onPress={() => openPet(pet.id)}
        />
      ))}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default PostChips;
