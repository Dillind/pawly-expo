import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import UserAvatar from '@/components/core/user-avatar';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';

const AVATAR = 56;

const CommentsEmpty = () => {
  const styles = useStyles(makeStyles);
  const { profile } = useAuthStore();

  return (
    <View style={styles.empty}>
      <UserAvatar
        firstName={profile?.firstName}
        lastName={profile?.lastName}
        avatarUrl={profile?.avatarUrl}
        size={AVATAR}
      />
      <AppText size={15} color="textSecondary" align="center">
        Be the first to comment
      </AppText>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    empty: {
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.six
    }
  });

export default CommentsEmpty;
