import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostLiker } from '@/services/post.service';
import { formatAuthorName } from '@/utils/members';
import { StyleSheet, View } from 'react-native';

type Props = {
  likers: PostLiker[];
};

const AVATAR_SIZE = 20;
const MAX_AVATARS = 3;

const summarise = (likers: PostLiker[]): string => {
  const [lead, ...rest] = likers;
  const name = formatAuthorName(lead);

  if (rest.length === 0) return `Liked by ${name}`;
  if (rest.length === 1) return `Liked by ${name} and 1 other`;

  return `Liked by ${name} and ${rest.length} others`;
};

const PostLikers = ({ likers }: Props) => {
  const styles = useStyles(makeStyles);

  if (likers.length === 0) return null;

  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {likers.slice(0, MAX_AVATARS).map((liker, index) => (
          <View
            key={liker.userId}
            style={[styles.avatar, index > 0 && styles.overlap]}
            // Every name is already in the sentence beside this.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <AvatarInitials
              firstName={liker.firstName}
              lastName={liker.lastName}
              size={AVATAR_SIZE}
            />
          </View>
        ))}
      </View>

      <AppText size={13} color="textSecondary" numberOfLines={1} style={styles.summary}>
        {summarise(likers)}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    stack: {
      flexDirection: 'row'
    },
    avatar: {
      borderWidth: 2,
      borderRadius: AVATAR_SIZE,
      borderColor: colors.backgroundElement
    },
    overlap: {
      marginLeft: -spacing.two
    },
    summary: {
      flexShrink: 1
    }
  });

export default PostLikers;
