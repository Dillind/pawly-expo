import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Divider, { RowInset } from '@/components/core/divider';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import UserAvatar from '@/components/core/user-avatar';
import { IconSize, type AppTheme } from '@/constants/theme';
import {
  useFollowRequestSummary,
  useMarkFollowRequestAlertsRead
} from '@/hooks/queries/follow/use-follows';
import { useStyles } from '@/hooks/use-styles';
import type { FollowRequestSummary } from '@/services/follow.service';
import { fullName } from '@/utils/members';

const AVATAR = 40;
const STACKED = 30;

type Props = {
  householdId: string;
  isOwner: boolean;
};

const summaryText = ({ newest, pendingCount }: FollowRequestSummary): string => {
  const name = fullName(newest[0]) || 'Someone';
  const others = pendingCount - 1;

  if (others <= 0) return name;

  return `${name} + ${others} ${others === 1 ? 'other' : 'others'}`;
};

// Stands in for every follow_requested alert, so seeing it reads them all.
const FollowRequestsRow = ({ householdId, isOwner }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: summary } = useFollowRequestSummary(householdId, isOwner);
  const { mutate: markRead } = useMarkFollowRequestAlertsRead(householdId);

  const hasUnread = summary?.hasUnread ?? false;

  useEffect(() => {
    if (hasUnread) markRead();
  }, [hasUnread, markRead]);

  if (!summary || summary.pendingCount === 0) return null;

  const [newest, second] = summary.newest;
  const text = summaryText(summary);

  return (
    <View>
      <PressableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Follow requests, ${text}`}
        style={styles.row}
        onPress={() => router.push(`/home/household/${householdId}/followers/requests`)}>
        {second ? (
          <View style={styles.stack}>
            <View style={styles.back}>
              <UserAvatar {...second} size={STACKED} />
            </View>
            <View style={styles.front}>
              <UserAvatar {...newest} size={STACKED} />
            </View>
          </View>
        ) : (
          <UserAvatar {...newest} size={AVATAR} />
        )}

        <View style={styles.body}>
          <AppText size="callout" fontWeight="semibold">
            Follow requests
          </AppText>
          <AppText size="footnote" color="textSecondary" numberOfLines={1}>
            {text}
          </AppText>
        </View>

        {hasUnread && <View style={styles.dot} />}
        <Icon name="caretRight" size={IconSize.inline} color="textSecondary" />
      </PressableOpacity>
      <Divider inset={RowInset} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingHorizontal: spacing.four,
      paddingVertical: spacing.three
    },
    stack: {
      width: AVATAR,
      height: AVATAR
    },
    back: {
      position: 'absolute',
      left: 0,
      top: 0
    },
    // The ring in the page colour is what separates the two faces.
    front: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      borderRadius: STACKED,
      borderWidth: 2,
      borderColor: colors.background
    },
    body: {
      flex: 1,
      gap: 2
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.primary
    }
  });

export default FollowRequestsRow;
