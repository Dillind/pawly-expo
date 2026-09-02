import PetAvatar from '@/components/core/pet-avatar';
import PostChip from '@/components/ui/post-chip';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostPetTag } from '@/services/post.service';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  pets: PostPetTag[];
};

const AVATAR = 20;

/**
 * Who is in the photo, under the caption. Renders nothing when no pet is
 * tagged, which is the common case -- tags are optional and never
 * pre-selected, so an untagged Post genuinely means "no pet in particular".
 */
const PostPetChips = ({ pets }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  if (pets.length === 0) return null;

  return (
    <View style={styles.row}>
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

export default PostPetChips;
