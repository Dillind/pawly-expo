import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import UserAvatar from '@/components/core/user-avatar';
import ScrollScreen from '@/components/layout/scroll-screen';
import { BottomTabInset, Spacing, type AppTheme } from '@/constants/theme';
import {
  useFollowers,
  useFollowRequests,
  useRemoveFollower
} from '@/hooks/queries/follow/use-follows';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useStyles } from '@/hooks/use-styles';
import type { Follower } from '@/services/follow.service';
import { fullName } from '@/utils/members';

const AVATAR_SIZE = 36;

type Props = {
  householdId: string;
};

/** "since August" -- the month they were accepted, which is all anyone reads it for. */
const sinceText = (follower: Follower): string | null => {
  const stamp = follower.respondedAt ?? follower.requestedAt;
  if (!stamp) return null;

  return `since ${new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(new Date(stamp))}`;
};

/**
 * The Owner's audience. Removing is here rather than on a follower's own
 * screen, because there is no such screen -- ADR 0036 keeps followers invisible
 * to each other, and that holds for the Owner's view of them too.
 */
const FollowersList = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHouseholdById(householdId);
  const { data: followers = [], isLoading, isError, refetch } = useFollowers(householdId);
  const { data: requests = [] } = useFollowRequests(householdId);
  const { mutate: removeFollower } = useRemoveFollower(householdId);

  const isOwner = household?.isOwner ?? false;

  // Removal blocks, so the alert says both halves: access ends, and the door
  // closes. Cancel is preferred because Remove has a consequence.
  const confirmRemove = (follower: Follower) => {
    const name = fullName(follower) || 'this follower';

    Alert.alert(
      `Remove ${name}?`,
      'They stop seeing your posts, and they cannot ask to follow you again.',
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFollower(follower.id)
        }
      ]
    );
  };

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError) {
      return <ErrorState title="Couldn't load your followers" onRetry={() => void refetch()} />;
    }

    return (
      <>
        {isOwner && requests.length > 0 && (
          <SettingsSection>
            <SettingsRow
              icon="userPlus"
              label="Requests"
              value={String(requests.length)}
              onPress={() => router.push(`/profile/household/${householdId}/followers/requests`)}
            />
          </SettingsSection>
        )}

        {followers.length === 0 ? (
          <EmptyState
            icon="users"
            title="No followers yet"
            description="Send someone your follow link. They ask, and you decide."
          />
        ) : (
          <SettingsSection
            title={`Followers · ${followers.length}`}
            dividerInset={Spacing.three + AVATAR_SIZE + Spacing.three}>
            {followers.map((follower) => {
              const name = fullName(follower) || 'Follower';
              const detail = sinceText(follower);

              const row = (
                <View style={styles.row}>
                  <UserAvatar
                    firstName={follower.firstName}
                    lastName={follower.lastName}
                    avatarUrl={follower.avatarUrl}
                    size={AVATAR_SIZE}
                  />
                  <View style={styles.rowText}>
                    <AppText size={16} numberOfLines={1}>
                      {name}
                    </AppText>
                    {detail != null && detail.length > 0 && (
                      <AppText size={13} color="textSecondary" numberOfLines={1}>
                        {detail}
                      </AppText>
                    )}
                  </View>
                  {isOwner && <Icon name="caretRight" size={16} color="textSecondary" />}
                </View>
              );

              if (!isOwner) return <View key={follower.id}>{row}</View>;

              return (
                <PressableOpacity
                  key={follower.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${name}`}
                  onPress={() => confirmRemove(follower)}>
                  {row}
                </PressableOpacity>
              );
            })}
          </SettingsSection>
        )}

        {isOwner && (
          <SettingsSection title="Share">
            <SettingsRow
              icon="share"
              label="Share a follow link"
              onPress={() => router.push(`/profile/household/${householdId}/followers/link`)}
            />
          </SettingsSection>
        )}
      </>
    );
  };

  return <ScrollScreen contentContainerStyle={styles.content}>{renderBody()}</ScrollScreen>;
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      marginTop: spacing.five
    },
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: 56,
      paddingHorizontal: spacing.three
    },
    rowText: {
      flex: 1,
      gap: spacing.half
    }
  });

export default FollowersList;
