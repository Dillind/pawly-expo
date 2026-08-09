import AppText from '@/components/core/app-text';
import PetAvatar from '@/components/core/pet-avatar';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
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
        <PressableOpacity
          key={pet.id}
          style={styles.chip}
          onPress={() => router.push(`/home/pet/${pet.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`View ${pet.name}`}>
          <PetAvatar photoUrl={pet.photoUrl} size={AVATAR} />
          <AppText size={13} color="textSecondary">
            {pet.name}
          </AppText>
        </PressableOpacity>
      ))}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.two
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      paddingVertical: spacing.one,
      paddingRight: spacing.two,
      paddingLeft: spacing.one,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundElement
    }
  });

export default PostPetChips;
