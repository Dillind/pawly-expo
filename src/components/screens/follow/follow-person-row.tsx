import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import UserAvatar from '@/components/core/user-avatar';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Follower } from '@/services/follow.service';
import { fullName } from '@/utils/members';

export const FOLLOW_PERSON_AVATAR = 48;

type Props = {
  person: Follower;
  detail: string;
  trailing?: ReactNode;
};

const FollowPersonRow = ({ person, detail, trailing }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row}>
      <UserAvatar
        firstName={person.firstName}
        lastName={person.lastName}
        avatarUrl={person.avatarUrl}
        size={FOLLOW_PERSON_AVATAR}
      />
      <View style={styles.text}>
        <AppText size="body" fontWeight="semibold" numberOfLines={1}>
          {fullName(person) || 'Someone'}
        </AppText>
        {detail.length > 0 && (
          <AppText size="footnote" color="textSecondary" numberOfLines={2}>
            {detail}
          </AppText>
        )}
      </View>
      {trailing}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: 64,
      paddingVertical: spacing.two
    },
    text: {
      flex: 1,
      gap: spacing.half
    }
  });

export default FollowPersonRow;
