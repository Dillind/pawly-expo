import PetAvatar from '@/components/core/pet-avatar';
import OccasionEmoji from '@/components/ui/occasion-emoji';
import PostChip from '@/components/ui/post-chip';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostOccasion, PostPetTag } from '@/services/post.service';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  occasion: PostOccasion | null;
  pets: PostPetTag[];
};

const AVATAR = 20;

/**
 * One row under the caption answering one question -- what this was, and who
 * was in it. The Occasion leads because it names the day; the Pets follow.
 *
 * Renders nothing when a Post has neither, which is the common case. Both are
 * optional and neither is ever pre-selected.
 */
const PostChips = ({ occasion, pets }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

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
          onPress={() => router.push(`/home/${pet.id}`)}
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
